package com.example.portfolio;

import java.util.function.UnaryOperator;

public interface PortfolioDataStore {
  PortfolioData read();

  PortfolioData update(UnaryOperator<PortfolioData> updater);
}
