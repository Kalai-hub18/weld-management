import MaterialCost from '../models/MaterialCost.js'
import OtherCost from '../models/OtherCost.js'
import WorkerSalary from '../models/WorkerSalary.js'
import Project from '../models/Project.js'
import { asyncHandler } from '../middleware/errorMiddleware.js'

// Helper to check project existence
const checkProject = async (projectId) => {
    const project = await Project.findById(projectId)
    if (!project) throw new Error('Project not found')
    return project
}

// ---------------- MATERIALS ----------------

// @desc    Add material cost
// @route   POST /api/projects/:id/materials
// @access  Private/Admin/Manager
export const addMaterial = asyncHandler(async (req, res) => {
    const { materialName, quantity, unitPrice, notes } = req.body
    const projectId = req.params.id

    await checkProject(projectId)

    const material = await MaterialCost.create({
        project: projectId,
        materialName,
        quantity,
        unitPrice,
        notes,
        createdBy: req.user._id
    })

    res.status(201).json({ success: true, data: material })
})

// @desc    Get project materials
// @route   GET /api/projects/:id/materials
// @access  Private
export const getMaterials = asyncHandler(async (req, res) => {
    const materials = await MaterialCost.find({ project: req.params.id })
        .sort({ createdAt: -1 })

    res.json({ success: true, data: materials })
})

// @desc    Update material cost
// @route   PUT /api/materials/:id
// @access  Private/Admin/Manager
export const updateMaterial = asyncHandler(async (req, res) => {
    const material = await MaterialCost.findById(req.params.id)

    if (!material) {
        res.status(404)
        throw new Error('Material cost not found')
    }

    const updatedMaterial = await MaterialCost.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    )

    res.json({ success: true, data: updatedMaterial })
})

// @desc    Delete material cost
// @route   DELETE /api/materials/:id
// @access  Private/Admin/Manager
export const deleteMaterial = asyncHandler(async (req, res) => {
    const material = await MaterialCost.findById(req.params.id)

    if (!material) {
        res.status(404)
        throw new Error('Material cost not found')
    }

    await material.deleteOne()
    res.json({ success: true, message: 'Material cost removed' })
})


// ---------------- OTHER COSTS ----------------

// @desc    Add other cost
// @route   POST /api/projects/:id/other-costs
// @access  Private/Admin/Manager
export const addOtherCost = asyncHandler(async (req, res) => {
    const { title, amount, description } = req.body
    const projectId = req.params.id

    await checkProject(projectId)

    const otherCost = await OtherCost.create({
        project: projectId,
        title,
        amount,
        description,
        createdBy: req.user._id
    })

    res.status(201).json({ success: true, data: otherCost })
})

// @desc    Get project other costs
// @route   GET /api/projects/:id/other-costs
// @access  Private
export const getOtherCosts = asyncHandler(async (req, res) => {
    const costs = await OtherCost.find({ project: req.params.id })
        .sort({ createdAt: -1 })

    res.json({ success: true, data: costs })
})

// @desc    Update other cost
// @route   PUT /api/other-costs/:id
// @access  Private/Admin/Manager
export const updateOtherCost = asyncHandler(async (req, res) => {
    const cost = await OtherCost.findById(req.params.id)

    if (!cost) {
        res.status(404)
        throw new Error('Cost item not found')
    }

    const updatedCost = await OtherCost.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    )

    res.json({ success: true, data: updatedCost })
})

// @desc    Delete other cost
// @route   DELETE /api/other-costs/:id
// @access  Private/Admin/Manager
export const deleteOtherCost = asyncHandler(async (req, res) => {
    const cost = await OtherCost.findById(req.params.id)

    if (!cost) {
        res.status(404)
        throw new Error('Cost item not found')
    }

    await cost.deleteOne()
    res.json({ success: true, message: 'Cost item removed' })
})


// ---------------- WORKER SALARIES ----------------

// @desc    Add worker salary
// @route   POST /api/projects/:id/salaries
// @access  Private/Admin/Manager
export const addSalary = asyncHandler(async (req, res) => {
    const { workerName, role, hoursWorked, ratePerHour } = req.body
    const projectId = req.params.id

    await checkProject(projectId)

    const salary = await WorkerSalary.create({
        project: projectId,
        workerName,
        role,
        hoursWorked,
        ratePerHour,
        createdBy: req.user._id
    })

    res.status(201).json({ success: true, data: salary })
})

// @desc    Get project salaries
// @route   GET /api/projects/:id/salaries
// @access  Private
export const getSalaries = asyncHandler(async (req, res) => {
    const salaries = await WorkerSalary.find({ project: req.params.id })
        .sort({ createdAt: -1 })

    res.json({ success: true, data: salaries })
})

// @desc    Update worker salary
// @route   PUT /api/salaries/:id
// @access  Private/Admin/Manager
export const updateSalary = asyncHandler(async (req, res) => {
    const salary = await WorkerSalary.findById(req.params.id)

    if (!salary) {
        res.status(404)
        throw new Error('Salary record not found')
    }

    const updatedSalary = await WorkerSalary.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    )

    res.json({ success: true, data: updatedSalary })
})

// @desc    Delete worker salary
// @route   DELETE /api/salaries/:id
// @access  Private/Admin/Manager
export const deleteSalary = asyncHandler(async (req, res) => {
    const salary = await WorkerSalary.findById(req.params.id)

    if (!salary) {
        res.status(404)
        throw new Error('Salary record not found')
    }

    await salary.deleteOne()
    res.json({ success: true, message: 'Salary record removed' })
})
