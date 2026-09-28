import sqlite3
conn = sqlite3.connect('s:/smart-kirana/backend/db.sqlite3')
cur = conn.cursor()
cur.execute('PRAGMA foreign_keys = OFF;')
cur.execute("UPDATE orders_order SET id = REPLACE(id, '-', '') WHERE id LIKE '%-%';")
cur.execute("UPDATE orders_orderitem SET order_id = REPLACE(order_id, '-', '') WHERE order_id LIKE '%-%';")
conn.commit()
conn.close()
print('Done')
