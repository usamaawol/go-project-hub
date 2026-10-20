import type { Request, Response, NextFunction } from "express";
import { TemplateModel } from "../models/Template";
import { isDbConnected } from "../config/db";
import { TEMPLATES } from "../../src/data/templates";

export async function listTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    const category = req.query.category as string;
    const search = req.query.search as string;

    if (isDbConnected()) {
      const query: Record<string, unknown> = { isPublished: true };
      if (category && category !== "All") {
        query.category = { $regex: new RegExp(`^${category}$`, "i") };
      }
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { tags: { $regex: search, $options: "i" } },
        ];
      }

      const templates = await TemplateModel.find(query).sort({ createdAt: -1 });
      if (templates.length > 0) {
        return res.json({ success: true, count: templates.length, data: templates });
      }
    }

    // In-memory / initial dataset fallback (110 templates)
    let filtered = TEMPLATES;
    if (category && category !== "All") {
      filtered = filtered.filter((t) => t.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    }

    res.json({
      success: true,
      count: filtered.length,
      data: filtered,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTemplateById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id;
    if (isDbConnected()) {
      const found = await TemplateModel.findOne({ templateId: id });
      if (found) {
        return res.json({ success: true, data: found });
      }
    }

    const staticFound = TEMPLATES.find((t) => t.id === id);
    if (!staticFound) {
      return res.status(404).json({
        success: false,
        error: { message: `Template with ID "${id}" not found.` },
      });
    }

    res.json({ success: true, data: staticFound });
  } catch (error) {
    next(error);
  }
}

export async function toggleTemplatePublish(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id;
    const { isPublished } = req.body;

    if (isDbConnected()) {
      const updated = await TemplateModel.findOneAndUpdate(
        { templateId: id },
        { isPublished: Boolean(isPublished) },
        { new: true, upsert: false },
      );
      return res.json({ success: true, data: updated });
    }

    res.json({
      success: true,
      message: `Template "${id}" publication status toggled to ${Boolean(isPublished)} (In-Memory).`,
    });
  } catch (error) {
    next(error);
  }
}
