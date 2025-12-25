import { useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Button,
    Box,
    Typography,
    Tooltip
} from '@mui/material'
import { Edit, Delete, Add } from '@mui/icons-material'
import MaterialModal from './MaterialModal'

const MaterialCostTable = ({ materials, onAdd, onUpdate, onDelete, userRole }) => {
    const [openModal, setOpenModal] = useState(false)
    const [selectedMaterial, setSelectedMaterial] = useState(null)

    const handleAddClick = () => {
        setSelectedMaterial(null)
        setOpenModal(true)
    }

    const handleEditClick = (material) => {
        setSelectedMaterial(material)
        setOpenModal(true)
    }

    const handleCloseModal = () => {
        setOpenModal(false)
        setSelectedMaterial(null)
    }

    const handleSave = (data) => {
        if (selectedMaterial) {
            onUpdate(selectedMaterial._id, data)
        } else {
            onAdd(data)
        }
    }

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            onDelete(id)
        }
    }

    const canEdit = ['Admin', 'Manager'].includes(userRole)

    const totalAmount = materials.reduce((sum, item) => sum + item.totalAmount, 0)

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Material Costs</Typography>
                {canEdit && (
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={handleAddClick}
                        size="small"
                    >
                        Add Material
                    </Button>
                )}
            </Box>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                            <TableCell>Material Name</TableCell>
                            <TableCell align="right">Quantity</TableCell>
                            <TableCell align="right">Unit Price</TableCell>
                            <TableCell align="right">Total</TableCell>
                            <TableCell>Notes</TableCell>
                            <TableCell align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {materials.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                    No materials added yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            materials.map((item) => (
                                <TableRow key={item._id} hover>
                                    <TableCell>{item.materialName}</TableCell>
                                    <TableCell align="right">{item.quantity}</TableCell>
                                    <TableCell align="right">${item.unitPrice}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                        ${item.totalAmount}
                                    </TableCell>
                                    <TableCell sx={{ maxWidth: 200 }} noWrap>
                                        <Tooltip title={item.notes || ''}>
                                            <span>{item.notes || '-'}</span>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell align="center">
                                        {canEdit ? (
                                            <>
                                                <IconButton size="small" color="primary" onClick={() => handleEditClick(item)}>
                                                    <Edit fontSize="small" />
                                                </IconButton>
                                                <IconButton size="small" color="error" onClick={() => handleDelete(item._id)}>
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </>
                                        ) : (
                                            <span style={{ color: '#999', fontSize: '0.8rem' }}>Read Only</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                        {/* Subtotal Row */}
                        {materials.length > 0 && (
                            <TableRow sx={{ bgcolor: 'action.selected' }}>
                                <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold' }}>
                                    Subtotal:
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                    ${totalAmount}
                                </TableCell>
                                <TableCell colSpan={2} />
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <MaterialModal
                open={openModal}
                onClose={handleCloseModal}
                onSave={handleSave}
                initialData={selectedMaterial}
            />
        </Box>
    )
}

export default MaterialCostTable
