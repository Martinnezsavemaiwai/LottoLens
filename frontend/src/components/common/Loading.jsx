import React from 'react';

/**
 * Loading component with glassmorphism and smooth animation
 */
const Loading = ({ message = "กำลังโหลดข้อมูล..." }) => {
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p className="loading-text">{message}</p>
      
      <style>{`
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          min-height: 200px;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin: 20px 0;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(var(--gold-rgb, 212, 175, 55), 0.1);
          border-radius: 50%;
          border-top-color: var(--gold3, #d4af37);
          animation: spin 1s ease-in-out infinite;
          margin-bottom: 16px;
        }

        .loading-text {
          color: var(--txt2, #aaa);
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 1px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Loading;
