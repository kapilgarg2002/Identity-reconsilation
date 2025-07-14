"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Contact extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Contact.belongsTo(Contact, {
        foreignKey: "linkedId",
        as: "linkedContact",
      });
      Contact.hasMany(Contact, {
        foreignKey: "linkedId",
        as: "secondaryContacts",
      });
    }
  }
  Contact.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      phoneNumber: DataTypes.STRING,
      email: DataTypes.STRING,
      linkedId: {
        type: DataTypes.INTEGER,
        references: {
          model: "Contacts",
          key: "id",
        },
      },
      linkPrecedence: {
        type: DataTypes.ENUM("primary", "secondary"),
        allowNull: false,
        defaultValue: "primary",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      deletedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "Contact",
      tableName: "contacts",
    }
  );
  return Contact;
};
