import { X, LogOut } from "lucide-react";

export default function LogoutModal({ onClose, onConfirm }) {
  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 10000 }}>
      <div 
        className="modal-content card" 
        onClick={e => e.stopPropagation()}
        style={{
          position: "relative",
          zIndex: 10001,
          padding: "48px 32px 32px 32px",
          textAlign: "center",
          maxWidth: "400px"
        }}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            background: "var(--s2)",
            border: "1px solid var(--bdr)",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--txt2)",
            transition: "all 500ms cubic-bezier(0.19, 1, 0.22, 1)"
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "var(--accent)";
            e.currentTarget.style.color = "var(--accent)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "var(--bdr)";
            e.currentTarget.style.color = "var(--txt2)";
          }}
          aria-label="ปิด"
        >
          <X size={16} />
        </button>

        {/* Brand Logout Icon */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "var(--s2)",
            border: "1px solid var(--bdr)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent)"
          }}>
            <LogOut size={26} style={{ marginLeft: "2px" }} />
          </div>
        </div>

        {/* Content */}
        <h2 style={{ 
          fontFamily: "Playfair Display, serif", 
          fontSize: "26px", 
          fontWeight: 400,
          color: "var(--txt)", 
          margin: "0 0 12px 0" 
        }}>
          Leaving so soon?
        </h2>
        <p style={{ 
          fontSize: "13px", 
          color: "var(--txt2)", 
          lineHeight: "1.7",
          margin: "0 0 32px 0"
        }}>
          การออกจากระบบจะหยุดการซิงค์ข้อมูลสถิติแบบเรียลไทม์ คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบจากแผงควบคุม LottoLens?
        </p>

        {/* Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button 
            onClick={onConfirm} 
            className="btn btn-g btn-full"
            style={{
              letterSpacing: "0.15em",
              fontWeight: 500
            }}
          >
            LOG OUT
          </button>
          <button 
            onClick={onClose} 
            className="btn btn-outline btn-full"
            style={{
              letterSpacing: "0.15em",
              fontWeight: 500
            }}
          >
            CANCEL
          </button>
        </div>

        {/* Quiet Luxury Ambient Image Detail */}
        <div style={{
          marginTop: "32px",
          opacity: 0.4,
          width: "100%",
          height: "80px",
          backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuCJ2GqcQ738WY01VszOdF16KmQ_L93eMAc6l0ImHsVcbz-9ZEtGEM0SGixH1rK6NfPX8qJJyt0ypeUKHDKjvhu2i9LnnjSpd2WxfyqHq5uM966HHm5XD2pC5PpCu7HMEQQi5pXYvTh54nCjqVeQpphl6ymOAc4rh6z4DSPI8i9rd8REVAj69nwAcC5Nd5SNkeXIHI9oFPjjHGXV10J1X5d9W76s8DCQ-O_JAyyuq6fujoGraTusywyrABODtt1R4VFxncmGARdIW6vG')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          border: "1px solid var(--bdr2)",
          borderRadius: "2px"
        }} />
      </div>
    </div>
  );
}
