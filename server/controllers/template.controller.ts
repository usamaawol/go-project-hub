import type { Request, Response, NextFunction } from "express";
import {
  listTemplates as getTemplatesList,
  getTemplateById as fetchTemplateById,
  toggleTemplatePublish as togglePublish,
} from "../services/templateService";

export async function listTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    const category = req.query.category as string;
    const search = req.query.search as string;

    const templates = await getTemplatesList({ category, search });
    res.json({
      success: true,
      count: templates.length,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTemplateById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id;
    const found = await fetchTemplateById(id);

    if (!found) {
      return res.status(404).json({
        success: false,
        error: { message: `Template with ID "${id}" not found.` },
      });
    }

    res.json({ success: true, data: found });
  } catch (error) {
    next(error);
  }
}

export async function toggleTemplatePublish(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id;
    const { isPublished } = req.body;

    const result = await togglePublish(id, Boolean(isPublished));
    res.json({
      success: true,
      data: result.data,
      message: `Template "${id}" publication status toggled to ${Boolean(isPublished)}.`,
    });
  } catch (error) {
    next(error);
  }
}
