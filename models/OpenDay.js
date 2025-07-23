const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OpenDay = sequelize.define('OpenDay', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  event_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Event name is required'
      },
      len: {
        args: [3, 200],
        msg: 'Event name must be between 3 and 200 characters'
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Event description is required'
      },
      len: {
        args: [10, 2000],
        msg: 'Description must be between 10 and 2000 characters'
      }
    }
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: {
        msg: 'Please provide a valid date'
      },
      isAfter: {
        args: new Date().toISOString(),
        msg: 'Event date must be in the future'
      }
    }
  },
  location: {
    type: DataTypes.STRING(300),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Event location is required'
      },
      len: {
        args: [3, 300],
        msg: 'Location must be between 3 and 300 characters'
      }
    }
  },
  capacity: {
    type: DataTypes.INTEGER,
    defaultValue: 100,
    validate: {
      min: {
        args: [1],
        msg: 'Capacity must be at least 1'
      }
    }
  },
  registered_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: {
        args: [0],
        msg: 'Registered count cannot be negative'
      }
    }
  },
  registration_deadline: {
    type: DataTypes.DATE,
    validate: {
      isDate: {
        msg: 'Please provide a valid registration deadline'
      }
    }
  },
  is_registration_open: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  event_type: {
    type: DataTypes.ENUM('virtual', 'physical', 'hybrid'),
    defaultValue: 'physical'
  },
  virtual_link: {
    type: DataTypes.STRING,
    validate: {
      isUrl: {
        msg: 'Please provide a valid virtual meeting link'
      }
    }
  },
  tags: {
    type: DataTypes.TEXT,
    get() {
      const rawValue = this.getDataValue('tags');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('tags', JSON.stringify(value || []));
    }
  },
  created_by: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Administrator'
  },
  attendees: {
    type: DataTypes.TEXT,
    get() {
      const rawValue = this.getDataValue('attendees');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('attendees', JSON.stringify(value || []));
    }
  },
  is_full: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.registered_count >= this.capacity;
    }
  },
  can_register: {
    type: DataTypes.VIRTUAL,
    get() {
      const now = new Date();
      const registrationOpen = this.is_registration_open;
      const notFull = !this.is_full;
      const beforeDeadline = !this.registration_deadline || now <= new Date(this.registration_deadline);
      const beforeEvent = now < new Date(this.date);
      
      return registrationOpen && notFull && beforeDeadline && beforeEvent;
    }
  },
  remaining_capacity: {
    type: DataTypes.VIRTUAL,
    get() {
      return Math.max(0, this.capacity - this.registered_count);
    }
  },
  formatted_date: {
    type: DataTypes.VIRTUAL,
    get() {
      if (!this.date) return 'TBD';
      const date = new Date(this.date);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }
}, {
  tableName: 'open_days',
  validate: {
    registrationDeadlineBeforeEvent() {
      if (this.registration_deadline && this.date && 
          new Date(this.registration_deadline) > new Date(this.date)) {
        throw new Error('Registration deadline must be before or on the event date');
      }
    }
  },
  hooks: {
    beforeSave: (openDay) => {
      // Update registered count based on attendees
      if (openDay.changed('attendees')) {
        const attendees = openDay.attendees || [];
        openDay.registered_count = attendees.filter(
          attendee => attendee.attendance_status === 'registered'
        ).length;
      }
    }
  },
  indexes: [
    {
      fields: ['date']
    },
    {
      fields: ['is_registration_open']
    },
    {
      fields: ['event_type']
    },
    {
      fields: ['event_name']
    }
  ]
});

// Instance methods
OpenDay.prototype.registerUser = async function(userId, userName) {
  // Get current attendees
  const currentAttendees = this.attendees || [];
  
  // Check if user is already registered
  const existingRegistration = currentAttendees.find(
    attendee => attendee.user_id === userId
  );
  
  if (existingRegistration) {
    throw new Error('User is already registered for this event');
  }
  
  // Check if registration is possible
  if (!this.can_register) {
    throw new Error('Registration is not available for this event');
  }
  
  // Add user to attendees
  currentAttendees.push({
    user_id: userId,
    user_name: userName || 'Unknown',
    registered_at: new Date().toISOString(),
    attendance_status: 'registered'
  });
  
  this.attendees = currentAttendees;
  return await this.save();
};

OpenDay.prototype.cancelRegistration = async function(userId) {
  const currentAttendees = this.attendees || [];
  
  const attendeeIndex = currentAttendees.findIndex(
    attendee => attendee.user_id === userId
  );
  
  if (attendeeIndex === -1) {
    throw new Error('User is not registered for this event');
  }
  
  currentAttendees[attendeeIndex].attendance_status = 'cancelled';
  this.attendees = currentAttendees;
  
  return await this.save();
};

// Class methods
OpenDay.getUpcoming = function(limit = 10) {
  return this.findAll({
    where: {
      date: {
        [sequelize.Sequelize.Op.gt]: new Date()
      },
      is_registration_open: true
    },
    order: [['date', 'ASC']],
    limit: limit
  });
};

OpenDay.getByDateRange = function(startDate, endDate) {
  return this.findAll({
    where: {
      date: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      }
    },
    order: [['date', 'ASC']]
  });
};

OpenDay.getAvailableForRegistration = function() {
  return this.findAll({
    where: {
      date: {
        [sequelize.Sequelize.Op.gt]: new Date()
      },
      is_registration_open: true,
      registered_count: {
        [sequelize.Sequelize.Op.lt]: sequelize.Sequelize.col('capacity')
      }
    },
    order: [['date', 'ASC']]
  });
};

module.exports = OpenDay;
