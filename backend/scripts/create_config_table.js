import pool from '../database/database.js';

async function setup() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`configuracoes_sistema\` (
        \`id\` INT NOT NULL DEFAULT 1,
        \`titulo_sistema\` VARCHAR(255) DEFAULT 'Organograma Corporativo',
        \`subtitulo_sistema\` VARCHAR(255) DEFAULT 'JHE Consultores Associados',
        \`tag_texto\` VARCHAR(100) DEFAULT 'Governança',
        \`tag_ativa\` TINYINT(1) DEFAULT 1,
        \`logo_clara\` LONGTEXT NULL,
        \`logo_escura\` LONGTEXT NULL,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      INSERT INTO \`configuracoes_sistema\` (\`id\`, \`titulo_sistema\`, \`subtitulo_sistema\`, \`tag_texto\`, \`tag_ativa\`)
      VALUES (1, 'Organograma Corporativo', 'JHE Consultores Associados', 'Governança', 1)
      ON DUPLICATE KEY UPDATE \`id\` = \`id\`;
    `);

    const [rows] = await pool.query('SELECT * FROM configuracoes_sistema');
    console.log('configuracoes_sistema initialized successfully:', rows);
    process.exit(0);
  } catch (err) {
    console.error('Error creating table:', err);
    process.exit(1);
  }
}

setup();
