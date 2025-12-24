import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <BrowserRouter>
                    <div className="min-h-screen transition-colors duration-200">
                        <Routes>
                            <Route path="/" element={
                                <div className="flex flex-col items-center justify-center h-screen space-y-4">
                                    <h1 className="text-4xl font-bold text-primary">Welding Management System</h1>
                                    <p className="text-lg text-secondary dark:text-gray-400">System Initialized.</p>
                                    <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-xl">
                                        <p>Ready to build pages.</p>
                                    </div>
                                </div>
                            } />
                        </Routes>
                    </div>
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;

