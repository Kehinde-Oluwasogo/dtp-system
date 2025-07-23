const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Student = sequelize.define('Student', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Full name is required'
      },
      len: {
        args: [2, 100],
        msg: 'Full name must be between 2 and 100 characters'
      }
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: {
      msg: 'This email is already registered'
    },
    validate: {
      isEmail: {
        msg: 'Please enter a valid email address'
      }
    }
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: {
        msg: 'Please enter a valid date of birth'
      },
      customValidator(value) {
        const dob = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        if (age < 16 || age > 18) {
          throw new Error('You must be between 16 and 18 years old to register');
        }
      }
    }
  }
}, {
  tableName: 'students',
  timestamps: true
});

module.exports = Student;
