package com.example.portfolio;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.JdbcTemplateAutoConfiguration;
import org.springframework.boot.autoconfigure.transaction.TransactionAutoConfiguration;

@SpringBootApplication(exclude = {
    DataSourceAutoConfiguration.class,
    JdbcTemplateAutoConfiguration.class,
    TransactionAutoConfiguration.class
})
public class PortfolioApplication {
  public static void main(String[] args) {
    SpringApplication.run(PortfolioApplication.class, args);
  }
}
