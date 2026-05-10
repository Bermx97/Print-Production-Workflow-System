import { Request, Response } from "express";

import {
  createStepEventV2
} from "./service";

import {
  getVisibleOrdersV2
} from "./getVisibleOrders";

export const getOrdersV2 = async (
  req: Request,
  res: Response
) => {

  return getVisibleOrdersV2(
    req,
    res
  );
};

export const startStepV2 = async (
  req: Request,
  res: Response
) => {

  const result =
    await createStepEventV2(
      Number(req.params.orderNumber),
      req.user.id,
      req.user.role,
      "START"
    );

  return res.json(result);
};

export const endStepV2 = async (
  req: Request,
  res: Response
) => {

  const result =
    await createStepEventV2(
      Number(req.params.orderNumber),
      req.user.id,
      req.user.role,
      "END"
    );

  return res.json(result);
};