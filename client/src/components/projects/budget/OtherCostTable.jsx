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
    Typography
} from '@mui/material'
import { Edit, Delete, Add } from '@mui/icons-material'
import OtherCostModal from './OtherCostModal'

const OtherCostTable = ({ costs, onAdd, onUpdate, onDelete, userRole }) => {
    const [openModal, setOpenModal] = useState(false)
    const [selectedCost, setSelectedCost] = useState(null)

    const handleAddClick = () => {
        setSelectedCost(null)
        setOpenModal(true)
    }

    const handleEditClick = (cost) => {
        setSelectedCost(cost)
        setOpenModal(true)
    }

    const handleCloseModal = () => {
        setOpenModal(false)
        setSelectedCost(null)
    }

    const handleSave = (data) => {
        if (selectedCost) {
            onUpdate(selectedCost._id, data)
        } else {
            onAdd(data)
        }
    }

    const handleDelete = (id) => {
        if (window.confirm('Delete this cost item?')) {
            onDelete(id)
        }
    }

    const canEdit = ['Admin', 'Manager'].includes(userRole)
    const totalAmount = costs.reduce((sum, item) => sum + item.amount, 0)

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Other Costs</Typography>
                {canEdit && (
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={handleAddClick}
                        size="small"
                    >
                        Add Expense
                    </Button>
                )}
            </Box>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                            <TableCell>Title</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell align="right">Amount</TableCell>
                            <TableCell align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {costs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                                    No other costs recorded.
                                </TableCell>
                            </TableRow>
                        ) : (
                            costs.map((item) => (
                                <TableRow key={item._id} hover>
                                    <TableCell>{item.title}</TableCell>
                                    <TableCell>{item.description || '-'}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                        ${item.amount}
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
                        {costs.length > 0 && (
                            <TableRow sx={{ bgcolor: 'action.selected' }}>
                                <TableCell colSpan={2} align="right" sx={{ fontWeight: 'bold' }}>
                                    Subtotal:
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                    ${totalAmount}
                                </TableCell>
                                <TableCell />
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <OtherCostModal
                open={openModal}
                onClose={handleCloseModal}
                onSave={handleSave}
                initialData={selectedCost}
            />
        </Box>
    )
}

export default OtherCostTable
