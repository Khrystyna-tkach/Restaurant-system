require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true, limit: "8mb" }));

const api = express.Router();
const AUTH_SECRET = process.env.AUTH_SECRET || "dev-secret-change-me";
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24;
const roles = ["ADMIN", "WAITER", "CHEF"];
const orderStatuses = ["new", "cooking", "ready", "paid", "cancelled"];

const toNumber = (value) => Number(value);
const publicUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
};

const base64Url = (value) => Buffer.from(value).toString("base64url");

const signPayload = (payload) => {
  return crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
};

const createToken = (user) => {
  const payload = base64Url(
    JSON.stringify({
      id: user.id,
      role: user.role,
      email: user.email,
      exp: Date.now() + TOKEN_TTL_MS,
    }),
  );
  return `${payload}.${signPayload(payload)}`;
};

const readToken = (token) => {
  const [payload, signature] = token?.split(".") || [];

  if (!payload || !signature || signPayload(payload) !== signature) {
    return null;
  }

  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  return data.exp > Date.now() ? data : null;
};

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

const verifyPassword = (password, storedPassword) => {
  const [salt, hash] = storedPassword.split(":");

  if (!salt || !hash) return false;

  const testHash = crypto.scryptSync(password, salt, 64);
  const storedHash = Buffer.from(hash, "hex");

  return storedHash.length === testHash.length && crypto.timingSafeEqual(storedHash, testHash);
};

const resolveCategoryId = async ({ categoryId, categoryName }) => {
  if (categoryId) return toNumber(categoryId);

  const name = categoryName?.trim();
  if (!name) return null;

  const existingCategory = await prisma.category.findFirst({
    where: { name },
  });

  if (existingCategory) return existingCategory.id;

  const category = await prisma.category.create({ data: { name } });
  return category.id;
};

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const tokenData = readToken(token);

    if (!tokenData) {
      return res.status(401).json({ message: "Потрібна авторизація" });
    }

    const user = await prisma.user.findUnique({
      where: { id: tokenData.id },
      select: publicUserSelect,
    });

    if (!user) {
      return res.status(401).json({ message: "Користувача не знайдено" });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({ message: "Недостатньо прав для цієї дії" });
    }

    next();
  };
};

const canChangeOrderStatus = (role, currentStatus, nextStatus) => {
  if (currentStatus === nextStatus) return true;
  if (role === "ADMIN") return true;
  if (role === "WAITER") return currentStatus === "new" && nextStatus === "cooking";
  if (role === "CHEF") {
    return (currentStatus === "new" && nextStatus === "cooking") || (currentStatus === "cooking" && nextStatus === "ready");
  }
  return false;
};

const toLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getDateRange = (dateValue) => {
  if (!dateValue) return null;

  const start = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
};

const orderInclude = {
  table: true,
  waiter: { select: { id: true, firstName: true, lastName: true, role: true } },
  items: { include: { dish: true } },
};

const getIngredientStatus = (ingredient) => {
  if (ingredient.quantity <= 0) return "out";
  if (ingredient.quantity <= ingredient.minAmount) return "low";
  return "available";
};

const ingredientSelect = {
  id: true,
  name: true,
  category: true,
  unit: true,
  quantity: true,
  minAmount: true,
  image: true,
  createdAt: true,
  updatedAt: true,
};

const formatIngredient = (ingredient) => ({
  ...ingredient,
  status: getIngredientStatus(ingredient),
});

api.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

api.post("/auth/register", async (req, res, next) => {
  try {
    const firstName = req.body.firstName?.trim();
    const lastName = req.body.lastName?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    const role = req.body.role || "WAITER";

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "Заповніть ім'я, прізвище, email і пароль" });
    }

    if (!roles.includes(role)) {
      return res.status(400).json({ message: "Некоректна роль користувача" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Пароль має містити мінімум 6 символів" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return res.status(409).json({ message: "Користувач з таким email вже існує" });
    }

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashPassword(password),
        role,
      },
      select: publicUserSelect,
    });

    res.status(201).json({ user, token: createToken(user) });
  } catch (error) {
    next(error);
  }
});

api.post("/auth/login", async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ message: "Email і пароль обов'язкові" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ message: "Невірний email або пароль" });
    }

    const { password: _password, ...safeUser } = user;
    res.json({ user: safeUser, token: createToken(safeUser) });
  } catch (error) {
    next(error);
  }
});

api.use(requireAuth);

api.get("/me", (req, res) => {
  res.json({ user: req.user });
});

api.get("/dashboard/admin", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const chartStart = new Date(todayStart);
    chartStart.setDate(chartStart.getDate() - 6);

    const [
      totalTables,
      freeTables,
      occupiedTables,
      totalDishes,
      activeDishes,
      inactiveDishes,
      totalCategories,
      totalOrders,
      activeOrders,
      todayOrders,
      paidOrdersToday,
      paidOrdersForChart,
      recentOrders,
      statusGroups,
    ] = await Promise.all([
      prisma.table.count(),
      prisma.table.count({ where: { isOccupied: false } }),
      prisma.table.count({ where: { isOccupied: true } }),
      prisma.dish.count(),
      prisma.dish.count({ where: { available: true } }),
      prisma.dish.count({ where: { available: false } }),
      prisma.category.count(),
      prisma.order.count(),
      prisma.order.count({ where: { status: { in: ["new", "cooking", "ready"] } } }),
      prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.order.findMany({
        where: {
          status: "paid",
          paidAt: {
            gte: todayStart,
            lt: tomorrowStart,
          },
        },
        select: { total: true, paidAt: true },
      }),
      prisma.order.findMany({
        where: {
          status: "paid",
          paidAt: {
            gte: chartStart,
            lt: tomorrowStart,
          },
        },
        select: { total: true, paidAt: true },
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          table: true,
          items: { include: { dish: true } },
        },
      }),
      prisma.order.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
    ]);

    const weekDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(chartStart);
      date.setDate(chartStart.getDate() + index);
      const key = toLocalDateKey(date);

      return {
        key,
        label: new Intl.DateTimeFormat("uk-UA", { weekday: "short" }).format(date),
        total: 0,
        orders: 0,
      };
    });
    const weekDayByKey = new Map(weekDays.map((day) => [day.key, day]));

    paidOrdersForChart.forEach((order) => {
      if (!order.paidAt) return;
      const key = toLocalDateKey(order.paidAt);
      const day = weekDayByKey.get(key);

      if (day) {
        day.total += order.total;
        day.orders += 1;
      }
    });

    const todayRevenue = paidOrdersToday.reduce((sum, order) => sum + order.total, 0);
    const weekRevenue = weekDays.reduce((sum, day) => sum + day.total, 0);
    const statusCounts = orderStatuses.reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {});

    statusGroups.forEach((group) => {
      statusCounts[group.status] = group._count.status;
    });

    res.json({
      generatedAt: new Date().toISOString(),
      tables: {
        total: totalTables,
        free: freeTables,
        occupied: occupiedTables,
      },
      dishes: {
        total: totalDishes,
        active: activeDishes,
        inactive: inactiveDishes,
      },
      categories: {
        total: totalCategories,
      },
      orders: {
        total: totalOrders,
        active: activeOrders,
        today: todayOrders,
        statusCounts,
        recent: recentOrders,
      },
      revenue: {
        today: todayRevenue,
        week: weekRevenue,
        chart: weekDays,
      },
    });
  } catch (error) {
    next(error);
  }
});

api.get("/dashboard/chef", requireRole("CHEF"), async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const kitchenWhere = {
      status: { in: ["new", "cooking", "ready"] },
      createdAt: {
        gte: todayStart,
        lt: tomorrowStart,
      },
    };

    const [orders, allIngredients] = await Promise.all([
      prisma.order.findMany({
        where: kitchenWhere,
        include: orderInclude,
        orderBy: { createdAt: "desc" },
      }),
      prisma.ingredient.findMany({ select: ingredientSelect, orderBy: { name: "asc" } }),
    ]);

    const ingredients = allIngredients.map(formatIngredient);
    const newOrders = orders.filter((order) => order.status === "new");
    const cookingOrders = orders.filter((order) => order.status === "cooking");
    const readyOrders = orders.filter((order) => order.status === "ready");
    const lowStock = ingredients
      .filter((ingredient) => ingredient.status === "low" || ingredient.status === "out")
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 5);

    const notifications = [
      ...lowStock.slice(0, 2).map((ingredient) => ({
        type: ingredient.status === "out" ? "danger" : "warning",
        title: ingredient.status === "out" ? `Закінчився ${ingredient.name}` : `Мало ${ingredient.name}`,
        text: `Залишилось ${ingredient.quantity} ${ingredient.unit}`,
      })),
      ...newOrders.slice(0, 2).map((order) => ({
        type: "info",
        title: `Нове замовлення #${order.id}`,
        text: `Столик ${order.table?.number || order.tableId} • ${order.items?.length || 0} страви`,
      })),
    ].slice(0, 5);

    res.json({
      generatedAt: new Date().toISOString(),
      summary: {
        new: newOrders.length,
        cooking: cookingOrders.length,
        ready: readyOrders.length,
        total: orders.length,
      },
      orders: {
        current: orders,
        new: newOrders,
        cooking: cookingOrders,
        ready: readyOrders,
      },
      ingredients: {
        lowStock,
        total: ingredients.length,
        available: ingredients.filter((ingredient) => ingredient.status === "available").length,
        low: ingredients.filter((ingredient) => ingredient.status === "low").length,
        out: ingredients.filter((ingredient) => ingredient.status === "out").length,
      },
      notifications,
    });
  } catch (error) {
    next(error);
  }
});

api.get("/dashboard/waiter", requireRole("WAITER"), async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const where = {
      waiterId: req.user.id,
      createdAt: {
        gte: todayStart,
        lt: tomorrowStart,
      },
    };

    const orders = await prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: "desc" },
    });

    const activeOrders = orders.filter((order) => ["new", "cooking", "ready"].includes(order.status));
    const activeTableIds = new Set(activeOrders.map((order) => order.tableId));
    const activeTables = Array.from(
      activeOrders
        .reduce((map, order) => {
          if (!map.has(order.tableId)) {
            map.set(order.tableId, {
              id: order.table?.id || order.tableId,
              number: order.table?.number || order.tableId,
              capacity: order.table?.capacity || 0,
              status: order.status,
              createdAt: order.createdAt,
              total: order.total,
            });
          }

          return map;
        }, new Map())
        .values(),
    ).sort((a, b) => a.number - b.number);

    const newOrders = orders.filter((order) => order.status === "new");
    const cookingOrders = orders.filter((order) => order.status === "cooking");
    const readyOrders = orders.filter((order) => order.status === "ready");

    res.json({
      generatedAt: new Date().toISOString(),
      waiter: req.user,
      summary: {
        myTables: activeTableIds.size,
        new: newOrders.length,
        cooking: cookingOrders.length,
        ready: readyOrders.length,
        total: orders.length,
      },
      orders: {
        recent: orders.slice(0, 6),
        active: activeOrders,
        new: newOrders,
        cooking: cookingOrders,
        ready: readyOrders,
      },
      tables: {
        active: activeTables,
      },
    });
  } catch (error) {
    next(error);
  }
});

api.get("/categories", async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      include: { dishes: true },
      orderBy: { id: "asc" },
    });
    res.json(categories);
  } catch (error) {
    next(error);
  }
});

api.get("/ingredients", requireRole("CHEF", "ADMIN"), async (req, res, next) => {
  try {
    const search = req.query.search?.trim();
    const category = req.query.category?.trim();
    const page = Math.max(toNumber(req.query.page) || 1, 1);
    const pageSize = Math.min(Math.max(toNumber(req.query.pageSize) || 8, 1), 50);

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { category: { contains: search } },
      ];
    }

    if (category && category !== "all") {
      where.category = category;
    }

    const [allIngredients, filteredIngredients, total] = await Promise.all([
      prisma.ingredient.findMany({ select: ingredientSelect, orderBy: { name: "asc" } }),
      prisma.ingredient.findMany({
        where,
        select: ingredientSelect,
        orderBy: { name: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.ingredient.count({ where }),
    ]);

    const formattedAll = allIngredients.map(formatIngredient);
    const formattedFiltered = filteredIngredients.map(formatIngredient);
    const categories = Object.values(
      formattedAll.reduce((acc, ingredient) => {
        if (!acc[ingredient.category]) {
          acc[ingredient.category] = { name: ingredient.category, count: 0 };
        }
        acc[ingredient.category].count += 1;
        return acc;
      }, {}),
    ).sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      ingredients: formattedFiltered,
      categories,
      summary: {
        total: formattedAll.length,
        available: formattedAll.filter((ingredient) => ingredient.status === "available").length,
        low: formattedAll.filter((ingredient) => ingredient.status === "low").length,
        out: formattedAll.filter((ingredient) => ingredient.status === "out").length,
      },
      lowStock: formattedAll
        .filter((ingredient) => ingredient.status === "low" || ingredient.status === "out")
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 6),
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.max(Math.ceil(total / pageSize), 1),
      },
    });
  } catch (error) {
    next(error);
  }
});

api.post("/ingredients", requireRole("CHEF", "ADMIN"), async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    const category = req.body.category?.trim();
    const unit = req.body.unit?.trim();
    const quantity = toNumber(req.body.quantity);
    const minAmount = toNumber(req.body.minAmount);

    if (!name || !category || !unit || Number.isNaN(quantity)) {
      return res.status(400).json({ message: "Назва, категорія, одиниця та кількість обов'язкові" });
    }

    const ingredient = await prisma.ingredient.create({
      data: {
        name,
        category,
        unit,
        quantity,
        minAmount: Number.isNaN(minAmount) ? 1 : minAmount,
        image: req.body.image?.trim() || null,
      },
      select: ingredientSelect,
    });

    res.status(201).json(formatIngredient(ingredient));
  } catch (error) {
    next(error);
  }
});

api.put("/ingredients/:id", requireRole("CHEF", "ADMIN"), async (req, res, next) => {
  try {
    const data = {};

    if (req.body.name !== undefined) data.name = req.body.name.trim();
    if (req.body.category !== undefined) data.category = req.body.category.trim();
    if (req.body.unit !== undefined) data.unit = req.body.unit.trim();
    if (req.body.quantity !== undefined) data.quantity = toNumber(req.body.quantity);
    if (req.body.minAmount !== undefined) data.minAmount = toNumber(req.body.minAmount);
    if (req.body.image !== undefined) data.image = req.body.image?.trim() || null;

    const ingredient = await prisma.ingredient.update({
      where: { id: toNumber(req.params.id) },
      data,
      select: ingredientSelect,
    });

    res.json(formatIngredient(ingredient));
  } catch (error) {
    next(error);
  }
});

api.delete("/ingredients/:id", requireRole("CHEF", "ADMIN"), async (req, res, next) => {
  try {
    await prisma.ingredient.delete({ where: { id: toNumber(req.params.id) } });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

api.post("/categories", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const name = req.body.name?.trim();

    if (!name) {
      return res.status(400).json({ message: "Назва категорії обов'язкова" });
    }

    const category = await prisma.category.create({ data: { name } });
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

api.delete("/categories/:id", requireRole("ADMIN"), async (req, res, next) => {
  try {
    await prisma.category.delete({ where: { id: toNumber(req.params.id) } });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

api.get("/dishes", async (req, res, next) => {
  try {
    const where = req.user.role === "ADMIN" ? {} : { available: true };
    const dishes = await prisma.dish.findMany({
      where,
      include: { category: true },
      orderBy: { id: "asc" },
    });
    res.json(dishes);
  } catch (error) {
    next(error);
  }
});

api.post("/dishes", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    const price = toNumber(req.body.price);
    const categoryId = await resolveCategoryId(req.body);

    if (!name || !price || !categoryId) {
      return res.status(400).json({ message: "Назва, ціна і категорія обов'язкові" });
    }

    const dish = await prisma.dish.create({
      data: {
        name,
        price,
        categoryId,
        image: req.body.image?.trim() || null,
        available: req.body.available === undefined ? true : Boolean(req.body.available),
      },
      include: { category: true },
    });

    res.status(201).json(dish);
  } catch (error) {
    next(error);
  }
});

api.put("/dishes/:id", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const data = {};

    if (req.body.name !== undefined) data.name = req.body.name.trim();
    if (req.body.price !== undefined) data.price = toNumber(req.body.price);
    if (req.body.categoryId !== undefined || req.body.categoryName !== undefined) {
      data.categoryId = await resolveCategoryId(req.body);
    }
    if (req.body.image !== undefined) data.image = req.body.image?.trim() || null;
    if (req.body.available !== undefined) data.available = Boolean(req.body.available);

    const dish = await prisma.dish.update({
      where: { id: toNumber(req.params.id) },
      data,
      include: { category: true },
    });

    res.json(dish);
  } catch (error) {
    next(error);
  }
});

api.delete("/dishes/:id", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const id = toNumber(req.params.id);
    const orderItemsCount = await prisma.orderItem.count({ where: { dishId: id } });

    if (orderItemsCount > 0) {
      const dish = await prisma.dish.update({
        where: { id },
        data: { available: false },
        include: { category: true },
      });

      return res.json({
        message: "Страву вже використовували в замовленнях, тому її переведено в неактивні",
        dish,
      });
    }

    await prisma.dish.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

api.get("/tables", requireRole("ADMIN", "WAITER"), async (req, res, next) => {
  try {
    const tables = await prisma.table.findMany({
      orderBy: { number: "asc" },
    });
    res.json(tables);
  } catch (error) {
    next(error);
  }
});

api.post("/tables", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const { number, capacity } = req.body;

    if (!number || !capacity) {
      return res.status(400).json({ message: "Номер столу і кількість місць обов'язкові" });
    }

    const table = await prisma.table.create({
      data: {
        number: toNumber(number),
        capacity: toNumber(capacity),
        isOccupied: false,
      },
    });

    res.status(201).json(table);
  } catch (error) {
    next(error);
  }
});

api.patch("/tables/:id/status", requireRole("ADMIN", "WAITER"), async (req, res, next) => {
  try {
    const { isOccupied } = req.body;
    const table = await prisma.table.update({
      where: { id: toNumber(req.params.id) },
      data: { isOccupied: Boolean(isOccupied) },
    });
    res.json(table);
  } catch (error) {
    next(error);
  }
});

api.delete("/tables/:id", requireRole("ADMIN"), async (req, res, next) => {
  try {
    await prisma.table.delete({ where: { id: toNumber(req.params.id) } });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

api.get("/orders/admin", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const page = Math.max(toNumber(req.query.page) || 1, 1);
    const pageSize = Math.min(Math.max(toNumber(req.query.pageSize) || 8, 1), 50);
    const status = req.query.status;
    const tableId = req.query.tableId ? toNumber(req.query.tableId) : null;
    const search = req.query.search?.trim();
    const dateRange = getDateRange(req.query.date);

    const baseWhere = {};

    if (status && status !== "all") baseWhere.status = status;
    if (tableId) baseWhere.tableId = tableId;
    if (dateRange) {
      baseWhere.createdAt = {
        gte: dateRange.start,
        lt: dateRange.end,
      };
    }
    if (search) {
      const idSearch = Number(search.replace("#", ""));
      baseWhere.OR = [
        ...(Number.isNaN(idSearch) ? [] : [{ id: idSearch }]),
        { table: { number: Number.isNaN(idSearch) ? -1 : idSearch } },
        { waiter: { firstName: { contains: search } } },
        { waiter: { lastName: { contains: search } } },
        { items: { some: { dish: { name: { contains: search } } } } },
      ];
    }

    const summaryWhere = { ...baseWhere };
    delete summaryWhere.status;

    const [orders, total, tables, totalCount, newCount, cookingCount, readyCount, completedCount] = await Promise.all([
      prisma.order.findMany({
        where: baseWhere,
        include: orderInclude,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where: baseWhere }),
      prisma.table.findMany({ orderBy: { number: "asc" } }),
      prisma.order.count({ where: summaryWhere }),
      prisma.order.count({ where: { ...summaryWhere, status: "new" } }),
      prisma.order.count({ where: { ...summaryWhere, status: "cooking" } }),
      prisma.order.count({ where: { ...summaryWhere, status: "ready" } }),
      prisma.order.count({ where: { ...summaryWhere, status: { in: ["paid", "cancelled"] } } }),
    ]);

    res.json({
      orders,
      tables,
      summary: {
        total: totalCount,
        new: newCount,
        cooking: cookingCount,
        ready: readyCount,
        completed: completedCount,
      },
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.max(Math.ceil(total / pageSize), 1),
      },
    });
  } catch (error) {
    next(error);
  }
});

api.get("/orders", async (req, res, next) => {
  try {
    const where = req.user.role === "CHEF" ? { status: { in: ["new", "cooking", "ready"] } } : {};
    const orders = await prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

api.post("/orders", requireRole("ADMIN", "WAITER"), async (req, res, next) => {
  try {
    const tableId = toNumber(req.body.tableId);
    const items = Array.isArray(req.body.items) ? req.body.items : [];

    if (!tableId || items.length === 0) {
      return res.status(400).json({ message: "Стіл і хоча б одна страва обов'язкові" });
    }

    const dishIds = items.map((item) => toNumber(item.dishId));
    const dishes = await prisma.dish.findMany({ where: { id: { in: dishIds }, available: true } });
    const dishById = new Map(dishes.map((dish) => [dish.id, dish]));

    const orderItems = items.map((item) => {
      const dishId = toNumber(item.dishId);
      const quantity = toNumber(item.quantity) || 1;
      const dish = dishById.get(dishId);

      if (!dish) {
        throw new Error(`Страву з id ${dishId} не знайдено`);
      }

      return {
        dishId,
        quantity,
        price: dish.price,
      };
    });

    const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const status = ["new", "cooking"].includes(req.body.status) ? req.body.status : "new";

    const order = await prisma.order.create({
      data: {
        tableId,
        total,
        status,
        waiterId: req.user.id,
        items: { create: orderItems },
      },
      include: orderInclude,
    });

    await prisma.table.update({
      where: { id: tableId },
      data: { isOccupied: true },
    });

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

api.patch("/orders/:id", async (req, res, next) => {
  try {
    const orderId = toNumber(req.params.id);
    const currentOrder = await prisma.order.findUnique({ where: { id: orderId } });

    if (!currentOrder) {
      return res.status(404).json({ message: "Замовлення не знайдено" });
    }

    const data = {};

    if (req.body.tableId !== undefined) {
      if (req.user.role !== "ADMIN") {
        return res.status(403).json({ message: "Тільки адміністратор може змінювати стіл замовлення" });
      }

      data.tableId = toNumber(req.body.tableId);
    }

    if (req.body.status !== undefined) {
      const nextStatus = req.body.status;

      if (!orderStatuses.includes(nextStatus)) {
        return res.status(400).json({ message: "Некоректний статус замовлення" });
      }

      if (!canChangeOrderStatus(req.user.role, currentOrder.status, nextStatus)) {
        return res.status(403).json({ message: "Недостатньо прав для зміни цього статусу" });
      }

      data.status = nextStatus;

      if (nextStatus === "paid" && currentOrder.status !== "paid") {
        data.paidAt = new Date();
      }

      if (nextStatus !== "paid" && currentOrder.status === "paid") {
        data.paidAt = null;
      }
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data,
      include: orderInclude,
    });

    if (["paid", "cancelled"].includes(order.status)) {
      await prisma.table.update({
        where: { id: order.tableId },
        data: { isOccupied: false },
      });
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
});

api.delete("/orders/:id", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const id = toNumber(req.params.id);

    await prisma.orderItem.deleteMany({ where: { orderId: id } });
    await prisma.order.delete({ where: { id } });

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use("/api", api);

app.use("/api", (req, res) => {
  res.status(404).json({ message: "API endpoint не знайдено" });
});

const frontendDist = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(frontendDist));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: error.message || "Помилка сервера" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
