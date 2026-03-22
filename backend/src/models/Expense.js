const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    item: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: [200, 'Item name cannot exceed 200 characters'],
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount (unit price) is required'],
      min: [0.01, 'Amount must be at least 0.01'],
    },
    quantity: {
      type: Number,
      default: 1,
      min: [1, 'Quantity must be at least 1'],
    },
    unit: {
      type: String,
      trim: true,
      maxlength: [20, 'Unit cannot exceed 20 characters'],
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: [true, 'Expense date is required'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      select: false, // Hidden by default — exclude from all queries
    },
  },
  { timestamps: true }
);

// ─── Indexes for fast queries ──────────────────────────
expenseSchema.index({ date: -1 });
expenseSchema.index({ categoryId: 1, date: -1 });
expenseSchema.index({ createdBy: 1, date: -1 });

//  Auto-compute totalAmount before save & update
expenseSchema.pre('save', function (next) {
  this.totalAmount = parseFloat((this.amount * this.quantity).toFixed(2));
  next();
});

module.exports = mongoose.model('Expense', expenseSchema);
