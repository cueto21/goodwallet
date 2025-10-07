ALTER TABLE shared_transactions ADD COLUMN approved TINYINT(1) DEFAULT 0;

INSERT INTO currencies (code, name, symbol) VALUES 
('PEN', 'Peruvian Sol', 'S/'),
('USD', 'US Dollar', '$'),
('EUR', 'Euro', '€');


INSERT INTO categories (user_id, name, type, icon, color, created_at, updated_at) VALUES 
(null, 'Salario', 'income', '💼', '#10b981', NOW(), NOW()),
(null, 'Freelance', 'income', '💻', '#3b82f6', NOW(), NOW()),
(null, 'Inversiones', 'income', '📈', '#f59e0b', NOW(), NOW()),
(null, 'Alquiler', 'income', '🏠', '#8b5cf6', NOW(), NOW()),
(null, 'Pensión', 'income', '👴', '#06b6d4', NOW(), NOW()),
(null, 'Otros Ingresos', 'income', '💰', '#ec4899', NOW(), NOW());

-- Categorías globales de gastos (7)
INSERT INTO categories (user_id, name, type, icon, color, created_at, updated_at) VALUES
(null, 'Comida', 'expense', '🍽️', '#ef4444', NOW(), NOW()),
(null, 'Comida Rápida', 'expense', '🍔', '#dc2626', NOW(), NOW()),
(null, 'Transporte', 'expense', '🚗', '#f97316', NOW(), NOW()),
(null, 'Entretenimiento', 'expense', '🎬', '#ec4899', NOW(), NOW()),
(null, 'Servicios', 'expense', '💡', '#eab308', NOW(), NOW()),
(null, 'Salud', 'expense', '🏥', '#22c55e', NOW(), NOW()),
(null, 'Educación', 'expense', '📚', '#06b6d4', NOW(), NOW());