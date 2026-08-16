import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Roles table
  await knex.schema.createTable('roles', (table) => {
    table.increments('id').primary();
    table.string('name', 50).unique().notNullable(); // e.g., 'admin', 'user'
  });

  // Permissions table
  await knex.schema.createTable('permissions', (table) => {
    table.increments('id').primary();
    table.string('name', 100).unique().notNullable(); // e.g., 'docs:read', 'users:delete'
  });

  // Role-Permissions mapping (Many-to-Many)
  await knex.schema.createTable('role_permissions', (table) => {
    table.integer('role_id').unsigned().references('id').inTable('roles').onDelete('CASCADE');
    table.integer('permission_id').unsigned().references('id').inTable('permissions').onDelete('CASCADE');
    table.primary(['role_id', 'permission_id']);
  });

  // User-Roles mapping (Many-to-Many)
  await knex.schema.createTable('user_roles', (table) => {
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.integer('role_id').unsigned().references('id').inTable('roles').onDelete('CASCADE');
    table.primary(['user_id', 'role_id']);
  });

  // Insert default roles and permissions
  await knex('roles').insert([
    { id: 1, name: 'admin' },
    { id: 2, name: 'user' },
  ]);

  await knex('permissions').insert([
    { id: 1, name: 'users:read' },
    { id: 2, name: 'users:write' },
    { id: 3, name: 'roles:read' },
    { id: 4, name: 'roles:write' },
  ]);

  // Admin gets all permissions
  await knex('role_permissions').insert([
    { role_id: 1, permission_id: 1 },
    { role_id: 1, permission_id: 2 },
    { role_id: 1, permission_id: 3 },
    { role_id: 1, permission_id: 4 },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_roles');
  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('permissions');
  await knex.schema.dropTableIfExists('roles');
}
