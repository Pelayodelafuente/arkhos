-- Migration 020: Remove leftover group nodes from canvas
-- Groups were removed from the Notes module. Any canvas_nodes with
-- node_type = 'group' are orphaned UI artifacts with no corresponding
-- application logic. Delete them and their connected edges.

-- 1. Delete edges connected to group nodes
DELETE FROM canvas_edges
WHERE from_node_id IN (
  SELECT id FROM canvas_nodes WHERE node_type = 'group'
)
OR to_node_id IN (
  SELECT id FROM canvas_nodes WHERE node_type = 'group'
);

-- 2. Delete the group nodes themselves
DELETE FROM canvas_nodes WHERE node_type = 'group';
