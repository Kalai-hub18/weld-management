import mongoose from 'mongoose'

const workerSalarySchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
            required: true,
        },
        workerName: {
            type: String,
            required: [true, 'Worker name is required'],
            trim: true,
        },
        role: {
            type: String,
            required: [true, 'Role is required'],
            trim: true,
        },
        hoursWorked: {
            type: Number,
            required: [true, 'Hours worked is required'],
            min: [0, 'Hours worked cannot be negative'],
        },
        ratePerHour: {
            type: Number,
            required: [true, 'Rate per hour is required'],
            min: [0, 'Rate per hour cannot be negative'],
        },
        totalSalary: {
            type: Number,
            required: true,
            default: function () {
                return this.hoursWorked * this.ratePerHour
            }
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

// Calculate totalSalary before saving
workerSalarySchema.pre('save', function (next) {
    if (this.isModified('hoursWorked') || this.isModified('ratePerHour')) {
        this.totalSalary = this.hoursWorked * this.ratePerHour
    }
    next()
})

const WorkerSalary = mongoose.model('WorkerSalary', workerSalarySchema)

export default WorkerSalary
