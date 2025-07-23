const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const Student = sequelize.define('Student', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
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
      msg: 'Email address already exists'
    },
    validate: {
      isEmail: {
        msg: 'Please provide a valid email address'
      }
    }
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: {
        msg: 'Please provide a valid date of birth'
      },
      isBefore: {
        args: new Date().toISOString().split('T')[0],
        msg: 'Date of birth must be in the past'
      }
    }
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: {
        args: [6, 255],
        msg: 'Password must be at least 6 characters long'
      }
    }
  },
  is_eligible: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  age: {
    type: DataTypes.VIRTUAL,
    get() {
      const today = new Date();
      const birthDate = new Date(this.date_of_birth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    }
  }
}, {
  tableName: 'students',
  hooks: {
    beforeCreate: async (student) => {
      // Hash password
      if (student.password_hash) {
        student.password_hash = await bcrypt.hash(student.password_hash, 12);
      }
      
      // Check eligibility (16-18 years old)
      const age = calculateAge(student.date_of_birth);
      student.is_eligible = age >= 16 && age <= 18;
    },
    beforeUpdate: async (student) => {
      // Hash password if changed
      if (student.changed('password_hash')) {
        student.password_hash = await bcrypt.hash(student.password_hash, 12);
      }
      
      // Update eligibility if date of birth changed
      if (student.changed('date_of_birth')) {
        const age = calculateAge(student.date_of_birth);
        student.is_eligible = age >= 16 && age <= 18;
      }
    }
  }
});

// Helper function to calculate age
function calculateAge(dateOfBirth) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

// Instance methods
Student.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password_hash);
};

Student.prototype.checkEligibility = function() {
  const age = calculateAge(this.date_of_birth);
  return age >= 16 && age <= 18;
};

// Class methods
Student.findEligible = function() {
  return this.findAll({ where: { is_eligible: true } });
};

module.exports = Student;
