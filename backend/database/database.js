import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregamento explícito por ambiente (.env.development ou .env.production) com fallback para .env
const currentEnv = process.env.NODE_ENV || 'development';
dotenv.config({ path: path.resolve(__dirname, `../.env.${currentEnv}`) });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME || 'jhe_organograma',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  timezone: 'local',
  ...(process.env.DB_SSL === 'true' || process.env.DB_SSL === '1'
    ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } }
    : {})
};

const pool = mysql.createPool(dbConfig);

/**
 * Verifica a conectividade inicial com o MySQL e retorna metadados do servidor.
 */
export async function testDatabaseConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.ping();
    console.log(
      `[DB] Conectado ao MySQL (${dbConfig.host}:${dbConfig.port}/${dbConfig.database}) | Ambiente: ${currentEnv}`
    );
    return true;
  } catch (error) {
    console.error(`[DB] Aviso: Banco MySQL indisponível no momento (${error.message}). Operando com fallback seguro.`);
    return false;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Executa um bloco de operações SQL dentro de uma transação ACID (InnoDB).
 * Faz COMMIT automático em caso de sucesso e ROLLBACK automático em caso de erro.
 *
 * @param {(connection: import('mysql2/promise').PoolConnection) => Promise<any>} callback
 */
export async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export default pool;
