const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Podcast = sequelize.define('Podcast', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Podcast title is required'
      },
      len: {
        args: [3, 200],
        msg: 'Title must be between 3 and 200 characters'
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Podcast description is required'
      },
      len: {
        args: [10, 2000],
        msg: 'Description must be between 10 and 2000 characters'
      }
    }
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isUrl: {
        msg: 'Please provide a valid URL'
      }
    }
  },
  duration: {
    type: DataTypes.INTEGER,
    validate: {
      min: {
        args: [1],
        msg: 'Duration must be at least 1 second'
      }
    }
  },
  file_size: {
    type: DataTypes.INTEGER,
    validate: {
      min: {
        args: [0],
        msg: 'File size cannot be negative'
      }
    }
  },
  file_type: {
    type: DataTypes.STRING(50),
    defaultValue: 'audio/mpeg',
    validate: {
      isIn: {
        args: [['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3']],
        msg: 'Invalid file type'
      }
    }
  },
  uploaded_by: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Administrator'
  },
  is_published: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  play_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: {
        args: [0],
        msg: 'Play count cannot be negative'
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
  formatted_duration: {
    type: DataTypes.VIRTUAL,
    get() {
      if (!this.duration) return 'Unknown';
      
      const hours = Math.floor(this.duration / 3600);
      const minutes = Math.floor((this.duration % 3600) / 60);
      const seconds = this.duration % 60;
      
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
    }
  },
  formatted_file_size: {
    type: DataTypes.VIRTUAL,
    get() {
      if (!this.file_size) return 'Unknown';
      
      const units = ['B', 'KB', 'MB', 'GB'];
      let size = this.file_size;
      let unitIndex = 0;
      
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
      }
      
      return `${size.toFixed(1)} ${units[unitIndex]}`;
    }
  }
}, {
  tableName: 'podcasts',
  indexes: [
    {
      fields: ['title']
    },
    {
      fields: ['is_published']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Instance methods
Podcast.prototype.incrementPlayCount = async function() {
  this.play_count += 1;
  return await this.save();
};

// Class methods
Podcast.getPopular = function(limit = 10) {
  return this.findAll({
    where: { is_published: true },
    order: [['play_count', 'DESC']],
    limit: limit
  });
};

Podcast.getRecent = function(limit = 10) {
  return this.findAll({
    where: { is_published: true },
    order: [['created_at', 'DESC']],
    limit: limit
  });
};

module.exports = Podcast;
