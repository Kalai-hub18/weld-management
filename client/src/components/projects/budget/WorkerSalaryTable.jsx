import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Box,
    Typography
} from '@mui/material'
import { useSettings } from '../../../context/SettingsContext'
import { formatCurrency } from '../../../utils/formatters'

const WorkerSalaryTable = ({ salaries = [] }) => {
    const { settings } = useSettings()
    const totalAmount = salaries.reduce((sum, item) => sum + Number(item.payable || 0), 0)

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Worker Salaries</Typography>
                <Typography variant="body2" color="text.secondary">
                    Read-only (derived from attendance + approved overtime)
                </Typography>
            </Box>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                            <TableCell>Worker Name</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell align="right">Days Worked</TableCell>
                            <TableCell align="right">Total Payable</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {salaries.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                                    No payable salary data yet (based on attendance).
                                </TableCell>
                            </TableRow>
                        ) : (
                            salaries.map((item) => (
                                <TableRow key={item.workerId || item._id} hover>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell>{item.role}</TableCell>
                                    <TableCell align="right">{item.daysWorked}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                        {formatCurrency(item.payable, settings)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                        {salaries.length > 0 && (
                            <TableRow sx={{ bgcolor: 'action.selected' }}>
                                <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold' }}>
                                    Subtotal:
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                    {formatCurrency(totalAmount, settings)}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    )
}

export default WorkerSalaryTable
