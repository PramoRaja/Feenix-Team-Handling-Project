import mysql from 'mysql2/promise';

// Create a single global singleton pool to prevent connection exhaustion on shared hosting
const poolConfig = {
  host: 'localhost',
  user: 'hivenzsn_feenixuser',
  password: 'Vishwa$#97',
  database: 'hivenzsn_feenixdb',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 4,
  queueLimit: 0,
  idleTimeout: 5000,
  enableKeepAlive: false,
  dateStrings: true,
};

let pool = global._mysqlPool;
if (!pool) {
  pool = mysql.createPool(poolConfig);
  global._mysqlPool = pool;
}

export default pool;
