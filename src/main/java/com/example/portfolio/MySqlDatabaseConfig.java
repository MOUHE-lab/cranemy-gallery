package com.example.portfolio;

import com.zaxxer.hikari.HikariDataSource;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Configuration
@ConditionalOnProperty(name = "portfolio.storage", havingValue = "mysql")
public class MySqlDatabaseConfig {
  @Bean
  public DataSource portfolioDataSource(
      @Value("${spring.datasource.url}") String url,
      @Value("${spring.datasource.username}") String username,
      @Value("${spring.datasource.password}") String password,
      @Value("${spring.datasource.driver-class-name:com.mysql.cj.jdbc.Driver}") String driverClassName) {
    HikariDataSource dataSource = new HikariDataSource();
    dataSource.setJdbcUrl(url);
    dataSource.setUsername(username);
    dataSource.setPassword(password);
    dataSource.setDriverClassName(driverClassName);
    dataSource.setMaximumPoolSize(5);
    dataSource.setPoolName("portfolio-mysql");
    return dataSource;
  }

  @Bean
  public JdbcTemplate portfolioJdbcTemplate(DataSource portfolioDataSource) {
    return new JdbcTemplate(portfolioDataSource);
  }

  @Bean
  public PlatformTransactionManager portfolioTransactionManager(DataSource portfolioDataSource) {
    return new DataSourceTransactionManager(portfolioDataSource);
  }

  @Bean
  public TransactionTemplate portfolioTransactionTemplate(PlatformTransactionManager portfolioTransactionManager) {
    return new TransactionTemplate(portfolioTransactionManager);
  }
}
