const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'flash_tans_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Initialize database and tables
const initDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    
    // Create products table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        description TEXT,
        image VARCHAR(255) DEFAULT '/images/placeholder.svg',
        stock INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create customers table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create orders table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(36) PRIMARY KEY,
        customer_id VARCHAR(36),
        total DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `);

    // Create order_items table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS order_items (
        id VARCHAR(36) PRIMARY KEY,
        order_id VARCHAR(36),
        product_id VARCHAR(36),
        product_name VARCHAR(255),
        price DECIMAL(10, 2),
        quantity INT,
        subtotal DECIMAL(10, 2),
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // Insert sample products if table is empty
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM products');
    if (rows[0].count === 0) {
      const sampleProducts = [
        {
          id: '1',
          name: 'Buckets',
          price: 29.99,
          description: 'Amazon S3 Buckets for scalable storage',
          stock: 50
        },
        {
          id: '2',
          name: 'Load Balancers',
          price: 34.99,
          description: 'Customizable load balancers for your applications',
          stock: 30
        },
        {
          id: '3',
          name: 'Microsoft Azure',
          price: 24.99,
          description: 'Cloud computing services for building, testing, and deploying applications',
          stock: 25
        }
      ];

      for (const product of sampleProducts) {
        await connection.execute(
          'INSERT INTO products (id, name, price, description, stock) VALUES (?, ?, ?, ?, ?)',
          [product.id, product.name, product.price, product.description, product.stock]
        );
      }
    }

    connection.release();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

module.exports = { pool, initDatabase };