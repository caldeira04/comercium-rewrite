INSERT INTO `expense_category` (`id`, `name`)
VALUES
  ('expense-category-energia', 'energia'),
  ('expense-category-agua', 'água'),
  ('expense-category-salario', 'salário'),
  ('expense-category-compra-produtos', 'compra de produtos'),
  ('expense-category-aluguel', 'aluguel'),
  ('expense-category-outros', 'outros')
ON CONFLICT(`name`) DO NOTHING;
