import express, { Express } from "express";
import winston, { Logger } from "winston";
import startChainflipService from "./watchers/chainflip";
import startEthereumService from "./watchers/ethereum";
import startPolkadotService from "./watchers/polkadot";
import getConfig, { env } from "./config/getConfig";
import { Config, Network } from "./config/interfaces";
import promClient from "prom-client";
import { Context } from "./lib/interfaces";
import createContext from "./lib/createContext";
import loadDefaultMetrics from "./lib/loadDefaultMetrics";
import startBitcoinService from "./watchers/bitcoin";
import startGithubService from "./watchers/github";

const logger: Logger = winston.createLogger();
logger.add(
  new winston.transports.Console({
    format: winston.format.json(),
    level: "debug",
  })
);

const app: Express = express();
const config: Config = getConfig(logger);

const chainflipRegistry = new promClient.Registry();
chainflipRegistry.setDefaultLabels({
    chain: "chainflip",
    network: config.flip.network,
  });

const polkadotRegistry = new promClient.Registry();
polkadotRegistry.setDefaultLabels({
    chain: "polkadot",
    network: config.dot.network,
  });

const ethereumRegistry = new promClient.Registry();
ethereumRegistry.setDefaultLabels({
    chain: "ethereum",
    network: config.eth.network,
  });

const bitcoinRegistry = new promClient.Registry();
bitcoinRegistry.setDefaultLabels({
    chain: "bitcoin",
    network: config.btc.network,
  });

const githubRegistry = new promClient.Registry();
githubRegistry.setDefaultLabels({
    chain: "github"
  });

app.listen(env.NETWORK_EXPORTER_PORT || 9000, () => {
  logger.info(`Network Prometheus Exporter started on port ${env.NETWORK_EXPORTER_PORT}`);

  if (config.flip.enabled) {
    const chainflipLogger: Logger = logger.child({ chain: "chainflip" });
    const chainflipContext: Context = createContext(
      chainflipLogger,
      chainflipRegistry,
      env,
      config.flip
    );
    loadDefaultMetrics(chainflipContext);
    startChainflipService(chainflipContext);
  }

  if (config.dot.enabled) {
    const polkadotLogger: Logger = logger.child({ chain: "polkadot" });
    const polkadotContext: Context = createContext(
      polkadotLogger,
      polkadotRegistry,
      env,
      config.dot
    );
    startPolkadotService(polkadotContext);
  }

  if (config.eth.enabled) {
    const ethereumLogger: Logger = logger.child({ chain: "ethereum" });
    const ethereumContext: Context = createContext(
      ethereumLogger,
      ethereumRegistry,
      env,
      config.eth
    );
    loadDefaultMetrics(ethereumContext);
    startEthereumService(ethereumContext);
  }

  if (config.btc.enabled) {
    const bitcoinLogger: Logger = logger.child({ chain: "bitcoin" });
    const bitcoinContext: Context = createContext(
      bitcoinLogger,
      bitcoinRegistry,
      env,
      config.btc
    );
    startBitcoinService(bitcoinContext);
  }

  if(config.github.enabled) {
    const githubLogger: Logger = logger.child({ chain: "github" });
    const githubContext: Context = createContext(
      githubLogger,
      githubRegistry,
      env,
      config.github
    );
    startGithubService(githubContext);
  }
});


app.get("/metrics", async (req, res) => {
  res.set('Content-Type', chainflipRegistry.contentType); // It doesn't matter which registry we use here
    res.end(
        await chainflipRegistry.metrics() +
        await ethereumRegistry.metrics() +
        await polkadotRegistry.metrics() +
        await bitcoinRegistry.metrics() +
        await githubRegistry.metrics()
    );
});