import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../UI/Button';
import { Card } from '../UI/Card';
export const SignupForm: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();

  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Role is fixed to patient in this signup view
  const role = 'patient' as const;

  // Medical identification fields
  const [nationalId, setNationalId] = useState('');
  const [insuranceNumber, setInsuranceNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('other');

  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !firstName || !lastName) {
      setError('Please complete required fields');
      return;
    }

    const success = await register({ email, password, firstName, lastName, role });
    if (!success) {
      setError('Registration failed');
      return;
    }

    // Save medical identification locally for demo purposes
    const storedUser = JSON.parse(localStorage.getItem('hoffman_user') || 'null');
    if (storedUser) {
      const medRecId = `medrec-${Date.now().toString()}`;
      const medical = {
        id: medRecId,
        userId: storedUser.id,
        nationalId,
        insuranceNumber,
        birthDate: birthDate ? new Date(birthDate).toISOString() : null,
        gender,
        createdAt: new Date().toISOString(),
      };

      const existing = JSON.parse(localStorage.getItem('hoffman_medical_history') || '[]');
      existing.push(medical);
      localStorage.setItem('hoffman_medical_history', JSON.stringify(existing));
    }

    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm sm:text-base text-gray-600">
            Complete your profile and medical identification
          </p>
        </div>

        <Card>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-3 sm:px-4 py-2 sm:py-3 rounded-md text-xs sm:text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First name</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Last name</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <input readOnly value={role} className="mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-md text-sm text-gray-700" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Date of birth</label>
                <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">National ID</label>
                <input value={nationalId} onChange={(e) => setNationalId(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Insurance number</label>
                <input value={insuranceNumber} onChange={(e) => setInsuranceNumber(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value as any)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex items-center justify-between space-x-3">
              <Button type="button" variant="outline" onClick={() => {
                // try to go back, otherwise go to login
                try {
                  navigate(-1);
                } catch {
                  navigate('/login');
                }
              }}>
                Back
              </Button>

              <Button type="submit" className="flex-1" disabled={isLoading}>{isLoading ? 'Creating...' : 'Create account'}</Button>
            </div>

          </form>
        </Card>

      </div>
    </div>
  );
};
