import mongoose from 'mongoose'

const materialCostSchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
            required: true,
        },
        materialName: {
            type: String,
            required: [true, 'Material name is required'],
            trim: true,
        },
        quantity: {
            type: Number,
            required: [true, 'Quantity is required'],
            min: [1, 'Quantity must be at least 1'],
        },
        unitPrice: {
            type: Number,
            required: [true, 'Unit price is required'],
            min: [0, 'Unit price cannot be negative'],
        },
        totalAmount: {
            type: Number,
            required: true,
            default: function () {
                return this.quantity * this.unitPrice
            }
        },
        notes: {
            type: String,
            trim: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }
    },
    {
        timestamps: true,
    }
)

// Calculate totalAmount before saving if not provided or modified
materialCostSchema.pre('save', function (next) {
    if (this.isModified('quantity') || this.isModified('unitPrice')) {
        this.totalAmount = this.quantity * this.unitPrice
    }
    next()
})

const MaterialCost = mongoose.model('MaterialCost', materialCostSchema)

export default MaterialCost
