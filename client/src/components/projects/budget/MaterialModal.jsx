import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    Box,
    Typography
} from '@mui/material'
import { useSettings } from '../../../context/SettingsContext'
import { formatCurrency } from '../../../utils/formatters'

const MaterialModal = ({ open, onClose, onSave, initialData }) => {
    const { settings } = useSettings()
    const [formData, setFormData] = useState({
        materialName: '',
        quantity: '',
        unitPrice: '',
        notes: ''
    })

    useEffect(() => {
        if (initialData) {
            setFormData({
                materialName: initialData.materialName || '',
                quantity: initialData.quantity || '',
                unitPrice: initialData.unitPrice || '',
                notes: initialData.notes || ''
            })
        } else {
            setFormData({
                materialName: '',
                quantity: '',
                unitPrice: '',
                notes: ''
            })
        }
    }, [initialData, open])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        onSave({
            ...formData,
            quantity: Number(formData.quantity),
            unitPrice: Number(formData.unitPrice)
        })
        onClose()
    }

    const total = (Number(formData.quantity) || 0) * (Number(formData.unitPrice) || 0)

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle>
                    {initialData ? 'Edit Material' : 'Add Material'}
                </DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                name="materialName"
                                label="Material Name"
                                fullWidth
                                required
                                value={formData.materialName}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                name="quantity"
                                label="Quantity"
                                type="number"
                                fullWidth
                                required
                                value={formData.quantity}
                                onChange={handleChange}
                                inputProps={{ min: 1 }}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                name="unitPrice"
                                label="Unit Price"
                                type="number"
                                fullWidth
                                required
                                value={formData.unitPrice}
                                onChange={handleChange}
                                inputProps={{ min: 0 }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, textAlign: 'right' }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Total Amount
                                </Typography>
                                <Typography variant="h6" color="primary.main">
                                    {formatCurrency(total, settings)}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                name="notes"
                                label="Notes"
                                fullWidth
                                multiline
                                rows={2}
                                value={formData.notes}
                                onChange={handleChange}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="contained">
                        Save
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    )
}

export default MaterialModal
