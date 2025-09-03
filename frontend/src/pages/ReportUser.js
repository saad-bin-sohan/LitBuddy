// frontend/src/pages/ReportUser.js
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReportForm from '../components/ReportForm';

const ReportUser = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: 900, margin: '24px auto', padding: 16 }}>
      <h2 style={{ marginBottom: 8 }}>Report a user</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Use this form to report inappropriate behavior, spam, impersonation, or harassment.
        You can optionally attach screenshots or PDFs as evidence.
      </p>

      <div style={{ marginTop: 16 }}>
        <ReportForm
          reportedUserId={userId}
          onSuccess={() => {
            // Friendly feedback then redirect or stay — here we redirect to home
            // You may change to navigate('/admin/reports') if you want admins to see it
            alert('Report submitted — thank you. Moderators will review it shortly.');
            navigate('/'); // or navigate(-1)
          }}
        />
      </div>
    </div>
  );
};

export default ReportUser;
