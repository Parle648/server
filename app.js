const express = require('express');
const { Pool } = require('pg');


const pool = new Pool({
  user: 'moral503',
  password: 'hG0rwDrm5KbOVGgM2yZyPagsPb3IQTQX',
  host: 'dpg-cmduaa6d3nmc73dn5bqg-a.oregon-postgres.render.com',
  port: '5432',
  database: 'lover_flower',
  ssl: {
    rejectUnauthorized: false, // Возможно, потребуется добавить эту опцию
  },
});

// Подключение к базе данных
pool.connect()
  .then(() => {
    console.log('Connected to the database');
  })
  .catch((err) => {
    console.error('Error connecting to the database', err);
  });

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Важно: На продакшене рекомендуется указать конкретный источник
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.get('/', async (req, res) => {
  res.status(200).json({ result: 'all ok' });
});

app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Products');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products/getproduct/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id.slice(2));
    const query = {
      text: 'SELECT * FROM Products WHERE id = $1',
      values: [id.slice(2)],
    };
    const result = await pool.query(query);
    console.log(result.rows);
    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Product not found' });
    } else {
      res.json(result.rows[0]);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products/:string', async (req, res) => {
  try {
    const { string } = req.params;
    const str = string.slice(1)
    const query = {
      text: 'SELECT * FROM Products WHERE title = $1',
      values: [str],
    };
    const result = await pool.query(`SELECT * FROM Products WHERE title = '${str}'`);
    console.log(`SELECT * FROM Products WHERE title = '${str}'`);
    if (result.rows.length === 0) {
      res.status(404).json("");
    } else {
      res.json(result.rows);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { cost, title, imgs, colors, light, format, flowers, description, categories, topics } = req.body;

    const query = {
      text: 'INSERT INTO Products (cost, title, imgs, colors, light, format, flowers, description, categories, topics) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      values: [cost, title, imgs, colors, light, format, flowers, description, categories, topics],
    };

    await pool.query(`INSERT INTO Products (cost, title, imgs, colors, light, format, flowers, description, categories, topics) VALUES(${cost}, '${title}', '${imgs}', '${colors}', '${light}', '${format}', '${flowers}', '${description}', '${categories}', '${topics}')`);
    res.status(201).json({ message: 'Product created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/currentProducts/:string', async (req, res) => {
  try {
    const {string} = req.params;

    const {types, sortBy, props} = JSON.parse(string.slice(1))
    console.log(types.value, sortBy.value, props.value)

    const products = await pool.query('SELECT * FROM Products');
    let result;

    if (types.value.length !== 0) {
        // sort when have types requirement
        const byTypes = types.value.map(type => {
            const arr = products.rows.map(prod => {
                if (prod.categories.includes(type)) {
                    return prod;
                }
            })

            return arr;
        })
        .flat()
        .filter(obj => {
            if (obj !== null) {
                return obj;
            };
        })

        const byProps = Object.values(props.value).flat().map(prop => {
            const arr = products.rows.map(prod => {
                if (prod.light.includes(prop.toUpperCase())) {
                    return prod;
                }
            })

            return arr;
        })
        .flat()
        .filter(obj => {
            if (obj !== null) {
                return obj;
            };
        })

        if (sortBy.value.length === 14) {
            result = byProps.concat(byTypes)
            .sort((a, b) => a.cost - b.cost);
        } else if (sortBy.value.length === 11) {
            result = byProps.concat(byTypes)
            .sort((a, b) => b.cost - a.cost);
        } else {
            result = byProps.concat(byTypes);
        }
        
        return res.json(result)
    } else if (Object.values(props.value).flat().length !== 0) { 
        // sort when have no types requirement
        const byProps = props.value.map(prop => {
            const arr = products.rows.map(prod => {
                if (prod.light.includes(prop)) {
                    return prod;
                }
            })

            return arr;
        })
        .flat()
        .filter(obj => {
            if (obj !== null) {
                return obj;
            };
        })

        if (sortBy.value.length === 14) {
            result = byProps.concat(byTypes)
            .sort((a, b) => a.cost - b.cost);
        } else if (sortBy.value.length === 11) {
            result = byProps.concat(byTypes)
            .sort((a, b) => b.cost - a.cost);
        }

        result = byProps.concat(byTypes);
        return res.json(result)
    } else {
      console.log(sortBy.value.length === 14);
        // sortBy.value when dont have any requirements
        if (sortBy.value.length === 14) {
            result = products.rows.sort((a, b) => a.cost - b.cost);
        } else if (sortBy.value.length === 11) {
            result = products.rows.sort((a, b) => b.cost - a.cost);
        } else {
            result = products.rows
        }
        return res.json(result)
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/calls', async (req, res) => {
  try {
    let x = '';

    // Создаем промис для ожидания завершения чтения данных из запроса
    const requestDataPromise = new Promise((resolve, reject) => {
      req.on('data', chunk => {
        x += chunk.toString();
      });
      req.on('end', () => {
        resolve();
      });
      req.on('error', (error) => {
        reject(error);
      });
    });

    // Ожидаем завершения чтения данных
    await requestDataPromise;

    // Парсим данные
    const requestData = JSON.parse(x);
    const { name, number,  } = requestData;
    console.log(`INSERT INTO Calls (name, number, ) VALUES('${name}', '${message}', '${number}')`);

    // Выполняем запрос к базе данных
    await pool.query(`INSERT INTO Calls (name, number, ) VALUES('${name}', '${message}', '${number}')`);

    res.status(201).json({ message: 'Product created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/corporative-clients', async (req, res) => {
  try {
    let x = '';

    const requestDataPromise = new Promise((resolve, reject) => {
      req.on('data', chunk => {
        x += chunk.toString();
      });
      req.on('end', () => {
        resolve();
      });
      req.on('error', (error) => {
        reject(error);
      });
    });

    // Ожидаем завершения чтения данных
    await requestDataPromise;

    // Парсим данные
    const requestData = JSON.parse(x);
    console.log(requestData);

    const {organisationName, mailIndex, contactPerson, contactNumber, busketAmount, emailAdress, YNP, currentAccount, bankCode, countOfOrders} = requestData;
    console.log(`INSERT INTO CorporativeClients ( organisationName, mailIndex, contactPerson, contactNumber, busketAmount, emailAdress, YNP, currentAccount, bankCode, countOfOrders) VALUES('${organisationName}', '${mailIndex}', '${contactPerson}', '${contactNumber}', '${busketAmount}', '${emailAdress}', '${YNP}', '${currentAccount}', '${bankCode}', '${countOfOrders}')`);
    // Выполняем запрос к базе '${данных}'
    await pool.query(`INSERT INTO CorporativeClients ( organisationName, mailIndex, contactPerson, contactNumber, busketAmount, emailAdress, YNP, currentAccount, bankCode, countOfOrders) VALUES('${organisationName}', '${mailIndex}', '${contactPerson}', '${contactNumber}', '${busketAmount}', '${emailAdress}', '${YNP}', '${currentAccount}', '${bankCode}', '${countOfOrders}')`);

    res.status(201).json({ message: 'Product created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


app.post('/api/review', async (req, res) => {
  try {
    const { review, name, mail, rating, productid } = req.body;

    await pool.query(`INSERT INTO Reviews (review, name, mail, rating, productid) VALUES('${review}', '${name}', '${mail}', ${rating}, ${productid})`);
    res.status(201).json({ message: 'Product created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/review/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idSliced = id.slice(1)

    const reviews = await pool.query(`SELECT * FROM Reviews WHERE productid = ${idSliced}`);
    res.status(201).json(reviews.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/order', async (req, res) => {
  try {
    const { name, number, mail, personName, personNumber, comment, deliveryType, city, street, corp, house, office, deliveryTime, paymentTime, orderedProducts } = req.body;

    const queryText = `
      INSERT INTO Orders 
        (name, number, mail, personname, personnumber, comment, deliverytype, city, street, corp, house, office, deliverytime, paymenttime, orderedproducts) 
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `;

    const values = [name, number, mail, personName, personNumber, comment, deliveryType, city, street, corp, house, office, deliveryTime, paymentTime, orderedProducts];

    await pool.query(queryText, values);
    res.status(201).json({ message: 'Product created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
