-- 013_projects_refactor.sql
-- Proyectos refactor: eliminar 'blocked', añadir plantillas sistema

-- 1. Migrar tareas 'blocked' a 'todo'
UPDATE phase_tasks SET status = 'todo' WHERE status = 'blocked';

-- 2. Reemplazar CHECK constraint para eliminar 'blocked'
ALTER TABLE phase_tasks DROP CONSTRAINT IF EXISTS phase_tasks_status_check;
ALTER TABLE phase_tasks ADD CONSTRAINT phase_tasks_status_check
  CHECK (status IN ('todo', 'in_progress', 'review', 'done'));

-- 3. Plantillas sistema nuevas (Landing Page ya existe en migración 010)
INSERT INTO project_templates (name, description, type, is_system, phases) VALUES
('WordPress / CMS', 'Proyecto web con WordPress o CMS', 'Web', true,
 '[{"name":"Diseño y maquetación","sort_order":0,"tasks":[{"text":"Wireframes","priority":"medium"},{"text":"Selección de tema","priority":"high"},{"text":"Personalización CSS","priority":"medium"}]},
   {"name":"Contenido","sort_order":1,"tasks":[{"text":"Textos principales","priority":"high"},{"text":"Imágenes y media","priority":"medium"},{"text":"SEO básico","priority":"medium"}]},
   {"name":"Plugins y funcionalidad","sort_order":2,"tasks":[{"text":"Formularios de contacto","priority":"high"},{"text":"Analytics","priority":"medium"},{"text":"Seguridad","priority":"high"},{"text":"Cache","priority":"low"}]},
   {"name":"Lanzamiento","sort_order":3,"tasks":[{"text":"Configurar dominio","priority":"high"},{"text":"SSL","priority":"high"},{"text":"Backup automático","priority":"medium"},{"text":"Testing","priority":"high"}]}]'),
('E-commerce', 'Tienda online completa', 'Web', true,
 '[{"name":"Diseño y UX","sort_order":0,"tasks":[{"text":"Wireframes","priority":"high"},{"text":"Flujo de compra","priority":"high"},{"text":"Design system","priority":"medium"}]},
   {"name":"Catálogo","sort_order":1,"tasks":[{"text":"Estructura de productos","priority":"high"},{"text":"Categorías","priority":"medium"},{"text":"Imágenes","priority":"medium"},{"text":"Precios","priority":"high"}]},
   {"name":"Pagos y envíos","sort_order":2,"tasks":[{"text":"Pasarela de pago","priority":"high"},{"text":"Métodos de envío","priority":"medium"},{"text":"Impuestos","priority":"medium"}]},
   {"name":"Desarrollo","sort_order":3,"tasks":[{"text":"Frontend","priority":"high"},{"text":"Backend/API","priority":"high"},{"text":"Panel de administración","priority":"medium"},{"text":"Testing","priority":"high"}]},
   {"name":"Lanzamiento","sort_order":4,"tasks":[{"text":"SEO","priority":"high"},{"text":"Legal — RGPD/Cookies","priority":"high"},{"text":"Dominio","priority":"medium"},{"text":"Monitorización","priority":"medium"}]}]'),
('API / Backend', 'Servicio backend o API REST', 'Web', true,
 '[{"name":"Arquitectura","sort_order":0,"tasks":[{"text":"Diseño de endpoints","priority":"high"},{"text":"Schema DB","priority":"high"},{"text":"Autenticación","priority":"high"}]},
   {"name":"Desarrollo","sort_order":1,"tasks":[{"text":"CRUD principal","priority":"high"},{"text":"Validaciones","priority":"medium"},{"text":"Middleware","priority":"medium"},{"text":"Tests","priority":"high"}]},
   {"name":"Despliegue","sort_order":2,"tasks":[{"text":"CI/CD","priority":"high"},{"text":"Documentación","priority":"medium"},{"text":"Monitorización","priority":"medium"},{"text":"Rate limiting","priority":"low"}]}]')
ON CONFLICT DO NOTHING;
