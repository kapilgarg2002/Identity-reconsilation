# Identity Reconciliation Backend

A Node.js/Express backend service for identity reconciliation that tracks customer identity across multiple purchases.
This project uses a simple **Disjoint Set Union (DSU)** algorithm to achieve the desired functionality.

## Features

- Track customer contacts across multiple purchases
- Link contacts based on shared email or phone number
- Automatic primary/secondary contact management
- Merge different contact groups when connections are discovered
- RESTful API with JSON responses

## Tech Stack

- Node.js
- Express.js
- Sequelize ORM
- MySQL



## Setup Instructions

1. **Update Database Configuration**
   Modify the database settings in `database/config/config.json` to match your local database credentials.

2. **Install Dependencies**
   From the root directory, run:

   ```bash
   npm install
   ```

3. **Run Database Migrations**
   Navigate to the `database` folder and run the migration command:

   ```bash
   cd database
   sequelize db:migrate
   ```

   > ⚠️ Run this only if the table has not already been created.

4. **Start the Application**
   From the root directory, start the server:

   ```bash
   node src/app.js
   ```

5. **Test the API**
   You can now send a `POST` request to:

   ```
   http://localhost:5000/identify
   ```
