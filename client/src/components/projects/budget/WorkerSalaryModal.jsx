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

const WorkerSalaryModal = ({ open, onClose, onSave, initialData }) => {
    const { settings } = useSettings()
    const [formData, setFormData] = useState({
        workerName: '',
        role: '',
        hoursWorked: '',
        ratePerHour: ''
    })

    useEffect(() => {
        if (initialData) {
            setFormData({
                workerName: initialData.workerName || '',
                role: initialData.role || '',
                hoursWorked: initialData.hoursWorked || '',
                ratePerHour: initialData.ratePerHour || ''
            })
        } else {
            setFormData({
                workerName: '',
                role: '',
                hoursWorked: '',
                ratePerHour: ''
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
            hoursWorked: Number(formData.hoursWorked),
            ratePerHour: Number(formData.ratePerHour)
        })
        onClose()
    }

    const total = (Number(formData.hoursWorked) || 0) * (Number(formData.ratePerHour) || 0)

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle>
                    {initialData ? 'Edit Salary' : 'Add Worker Salary'}
                </DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                name="workerName"
                                label="Worker Name"
                                fullWidth
                                required
                                value={formData.workerName}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                name="role"
                                label="Role"
                                fullWidth
                                required
                                value={formData.role}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                name="hoursWorked"
                                label="Hours Worked"
                                type="number"
                                fullWidth
                                required
                                value={formData.hoursWorked}
                                onChange={handleChange}
                                inputProps={{ min: 0 }}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                name="ratePerHour"
                                label="Rate Per Hour"
                                type="number"
                                fullWidth
                                required
                                value={formData.ratePerHour}
                                onChange={handleChange}
                                inputProps={{ min: 0 }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, textAlign: 'right' }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Total Salary
                                </Typography>
                                <Typography variant="h6" color="primary.main">
                                    {formatCurrency(total, settings)}
                                </Typography>
                            </Box>
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

export default WorkerSalaryModal
