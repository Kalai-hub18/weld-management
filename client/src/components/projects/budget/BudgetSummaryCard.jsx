import { Card, CardContent, Typography, Grid, Box, LinearProgress } from '@mui/material'
import { useSettings } from '../../../context/SettingsContext'
import { formatCurrency } from '../../../utils/formatters'

const BudgetSummaryCard = ({ summary }) => {
    const { settings } = useSettings()
    if (!summary) return null

    const { totalBudget, spent, remaining } = summary
    const percentage = Math.min((spent / totalBudget) * 100, 100)

    const isOverBudget = spent > totalBudget

    return (
        <Card elevation={3} sx={{ mb: 4, bgcolor: 'background.paper' }}>
            <CardContent>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    Budget Overview
                </Typography>

                <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} lg={4}>
                        <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary">Total Budget</Typography>
                            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                {formatCurrency(totalBudget, settings)}
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} lg={4}>
                        <Box sx={{ p: 2, bgcolor: '#FEE2E2', borderRadius: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary">Total Spent</Typography>
                            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                                {formatCurrency(spent, settings)}
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} lg={4}>
                        <Box sx={{
                            p: 2,
                            bgcolor: isOverBudget ? '#FEE2E2' : '#DCFCE7',
                            borderRadius: 2
                        }}>
                            <Typography variant="subtitle2" color="text.secondary">Remaining</Typography>
                            <Typography variant="h4" sx={{
                                fontWeight: 'bold',
                                color: isOverBudget ? 'error.main' : 'success.main'
                            }}>
                                {formatCurrency(remaining, settings)}
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>

                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Budget Utilization</Typography>
                        <Typography variant="body2" fontWeight="bold">
                            {percentage.toFixed(1)}%
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={percentage}
                        color={percentage > 90 ? 'error' : 'primary'}
                        sx={{ height: 10, borderRadius: 5 }}
                    />
                </Box>
            </CardContent>
        </Card>
    )
}

export default BudgetSummaryCard
