const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Order {
  static async create(orderData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const orderId = uuidv4();
      const { customerId, total, items } = orderData;
      
      // Create order
      await connection.execute(
        'INSERT INTO orders (id, customer_id, total) VALUES (?, ?, ?)',
        [orderId, customerId, total]
      );
      
      // Create order items
      for (const item of items) {
        const itemId = uuidv4();
        await connection.execute(
          'INSERT INTO order_items (id, order_id, product_id, product_name, price, quantity, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [itemId, orderId, item.productId, item.productName, item.price, item.quantity, item.subtotal]
        );
        
        // Update product stock
        await connection.execute(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.productId]
        );
      }
      
      await connection.commit();
      return await this.getById(orderId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getById(id) {
    try {
      const [orderRows] = await pool.execute(`
        SELECT o.*, c.name as customer_name, c.email as customer_email, c.address as customer_address
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.id = ?
      `, [id]);
      
      if (orderRows.length === 0) return null;
      
      const [itemRows] = await pool.execute(`
        SELECT * FROM order_items WHERE order_id = ?
      `, [id]);
      
      return {
        ...orderRows[0],
        items: itemRows
      };
    } catch (error) {
      throw error;
    }
  }

  static async getAll() {
    try {
      const [rows] = await pool.execute(`
        SELECT o.*, c.name as customer_name, c.email as customer_email
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        ORDER BY o.created_at DESC
      `);
      return rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Order;