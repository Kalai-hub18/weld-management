import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid
} from '@mui/material'

const OtherCostModal = ({ open, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        description: ''
    })

    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title || '',
                amount: initialData.amount || '',
                description: initialData.description || ''
            })
        } else {
            setFormData({
                title: '',
                amount: '',
                description: ''
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
            amount: Number(formData.amount)
        })
        onClose()
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle>
                    {initialData ? 'Edit Cost Item' : 'Add Cost Item'}
                </DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                name="title"
                                label="Title"
                                fullWidth
                                required
                                value={formData.title}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                name="amount"
                                label="Amount"
                                type="number"
                                fullWidth
                                required
                                value={formData.amount}
                                onChange={handleChange}
                                inputProps={{ min: 0 }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                name="description"
                                label="Description"
                                fullWidth
                                multiline
                                rows={3}
                                value={formData.description}
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

export default OtherCostModal
