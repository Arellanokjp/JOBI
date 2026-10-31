import { Navigate, Route, Routes } from 'react-router-dom';
import { homeFor, useAuth } from './lib/auth';
import { Layout, RequireRole } from './components/Layout';
import { Loading } from './components/ui';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';
import ForgotPassword from './pages/auth/ForgotPassword';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Interviews from './pages/Interviews';
import MyApplications from './pages/seeker/MyApplications';
import SavedJobs from './pages/seeker/SavedJobs';
import ResumePage from './pages/seeker/ResumePage';
import MyJobs from './pages/employer/MyJobs';
import FormBuilder from './pages/employer/FormBuilder';
import Applicants from './pages/employer/Applicants';
import ApplicantDetail from './pages/employer/ApplicantDetail';
import CompanyPage from './pages/employer/CompanyPage';
import CompanyReviews from './pages/admin/CompanyReviews';
import UsersAdmin from './pages/admin/UsersAdmin';
import Catalog from './pages/admin/Catalog';
import AuditLog from './pages/admin/AuditLog';

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify" element={<VerifyEmail />} />
      <Route path="/forgot" element={<ForgotPassword />} />

      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/interviews" element={<RequireRole roles={['JOB_SEEKER', 'EMPLOYER']}><Interviews /></RequireRole>} />

        <Route path="/applications" element={<RequireRole roles={['JOB_SEEKER']}><MyApplications /></RequireRole>} />
        <Route path="/saved" element={<RequireRole roles={['JOB_SEEKER']}><SavedJobs /></RequireRole>} />
        <Route path="/resume" element={<RequireRole roles={['JOB_SEEKER']}><ResumePage /></RequireRole>} />

        <Route path="/my-jobs" element={<RequireRole roles={['EMPLOYER']}><MyJobs /></RequireRole>} />
        <Route path="/my-jobs/:id/form" element={<RequireRole roles={['EMPLOYER']}><FormBuilder /></RequireRole>} />
        <Route path="/applicants" element={<RequireRole roles={['EMPLOYER']}><Applicants /></RequireRole>} />
        <Route path="/applicants/:id" element={<RequireRole roles={['EMPLOYER']}><ApplicantDetail /></RequireRole>} />
        <Route path="/company" element={<RequireRole roles={['EMPLOYER']}><CompanyPage /></RequireRole>} />

        <Route path="/admin/companies" element={<RequireRole roles={['ADMIN']}><CompanyReviews /></RequireRole>} />
        <Route path="/admin/users" element={<RequireRole roles={['ADMIN']}><UsersAdmin /></RequireRole>} />
        <Route path="/admin/catalog" element={<RequireRole roles={['ADMIN']}><Catalog /></RequireRole>} />
        <Route path="/admin/audit" element={<RequireRole roles={['ADMIN']}><AuditLog /></RequireRole>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
