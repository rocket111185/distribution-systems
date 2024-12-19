const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    logging: false,
});

const Event = sequelize.define("Event", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    event_type: DataTypes.STRING,
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW,
    },
    data: DataTypes.JSON,
});

const OrderProjection = sequelize.define("OrderProjection", {
    order_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
    },
    product_id: DataTypes.INTEGER,
    quantity: DataTypes.INTEGER,
});

async function initDB() {
    await sequelize.sync();
    console.log("Database initialized");
}

module.exports = { sequelize, Event, OrderProjection, initDB };
