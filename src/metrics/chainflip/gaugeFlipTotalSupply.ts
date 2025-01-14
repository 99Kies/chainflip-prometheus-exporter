import promClient, { Gauge } from "prom-client";
import { Context } from "../../lib/interfaces";

const metricName: string = "cf_flip_total_supply";
const metric: Gauge = new promClient.Gauge({
  name: metricName,
  help: "The total number of flip issued",
  registers: [],
});

export const gaugeFlipTotalSupply = async (context: Context): Promise<void> => {
  const { logger, api, registry, metricFailure } = context;

  logger.debug(`Scraping ${metricName}`);
  metricFailure.labels({ metric: metricName }).set(0);
  if (registry.getSingleMetric(metricName) === undefined)
    registry.registerMetric(metric);
  try {
    const totalSupply: bigint = await api.query.flip.totalIssuance();
    const metricValue: number = Number(Number(totalSupply) / 10 ** 18);
    metric.set(metricValue);
  } catch (err) {
    logger.error(err);
    metricFailure.labels({ metric: metricName }).set(1);
  }
};
