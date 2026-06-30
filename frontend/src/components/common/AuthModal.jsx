import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { X, Mail, Lock, Loader2, Sparkles, AlertCircle, CheckCircle } from "lucide-react";

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal, login, register, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!showAuthModal) return null;

  const handleClose = () => {
    setShowAuthModal(false);
    setError("");
    setSuccess("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleAutoFill = () => {
    setEmail("admin@lottolens.com");
    setPassword("admin1234");
    setIsLogin(true);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim() || !password) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    if (!email.includes("@")) {
      setError("กรุณากรอกอีเมลให้ถูกต้อง");
      return;
    }

    if (password.length < 8) {
      setError("รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร");
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }

    try {
      if (isLogin) {
        await login(email, password);
        setSuccess("เข้าสู่ระบบสำเร็จ!");
      } else {
        await register(email, password);
        setSuccess("สมัครสมาชิกและเข้าสู่ระบบสำเร็จ!");
      }
    } catch (err) {
      setError(err.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleClose} style={{ zIndex: 10000 }}>
      <div 
        className="modal-content card" 
        onClick={e => e.stopPropagation()}
        style={{
          position: "relative",
          zIndex: 10001
        }}
      >
        {/* Close Button */}
        <button 
          onClick={handleClose}
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

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h2 style={{ 
            fontFamily: "Playfair Display, serif", 
            fontSize: "26px", 
            fontWeight: 400,
            fontStyle: "italic",
            color: "var(--accent)", 
            margin: "0 0 6px 0" 
          }}>
            LottoLens Portal
          </h2>
          <p style={{ 
            fontSize: "11px", 
            color: "var(--txt3)", 
            textTransform: "uppercase", 
            letterSpacing: "0.08em", 
            fontWeight: 500, 
            margin: 0 
          }}>
            {isLogin ? "เข้าสู่ระบบเพื่อใช้งานฟีเจอร์ระดับแอดมิน" : "สมัครสมาชิกสำหรับเข้าใช้งานระบบ"}
          </p>
        </div>

        {/* Tab Selector (Segmented Switcher) */}
        <div 
          style={{
            display: "flex",
            background: "var(--s2)",
            border: "1px solid var(--bdr)",
            borderRadius: "var(--r-pill)",
            padding: "4px",
            marginBottom: "20px"
          }}
        >
          <button 
            type="button"
            onClick={() => { setIsLogin(true); setError(""); }}
            style={{
              flex: 1,
              padding: "8px",
              background: isLogin ? "var(--accent)" : "transparent",
              border: "none",
              borderRadius: "var(--r-pill)",
              color: isLogin ? "#ffffff" : "var(--txt3)",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 400ms cubic-bezier(0.19, 1, 0.22, 1)"
            }}
          >
            เข้าสู่ระบบ
          </button>
          <button 
            type="button"
            onClick={() => { setIsLogin(false); setError(""); }}
            style={{
              flex: 1,
              padding: "8px",
              background: !isLogin ? "var(--accent)" : "transparent",
              border: "none",
              borderRadius: "var(--r-pill)",
              color: !isLogin ? "#ffffff" : "var(--txt3)",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 400ms cubic-bezier(0.19, 1, 0.22, 1)"
            }}
          >
            สมัครสมาชิก
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div 
            style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid var(--red)",
              color: "var(--red)",
              borderRadius: "var(--r)",
              padding: "10px 14px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px"
            }}
          >
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div 
            style={{
              background: "rgba(34, 197, 94, 0.08)",
              border: "1px solid var(--green)",
              color: "var(--green)",
              borderRadius: "var(--r)",
              padding: "10px 14px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px"
            }}
          >
            <CheckCircle size={14} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ 
              fontSize: "11px", 
              color: "var(--txt3)", 
              textTransform: "uppercase", 
              letterSpacing: "0.08em", 
              fontWeight: 500,
              display: "block", 
              marginBottom: "6px" 
            }}>
              อีเมล
            </label>
            <div style={{ position: "relative" }}>
              <Mail size={14} style={{ position: "absolute", left: "4px", top: "50%", transform: "translateY(-50%)", color: "var(--txt3)", opacity: 0.7 }} />
              <input 
                type="email" 
                className="inp"
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ paddingLeft: "32px", paddingRight: "8px", width: "100%" }}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label style={{ 
              fontSize: "11px", 
              color: "var(--txt3)", 
              textTransform: "uppercase", 
              letterSpacing: "0.08em", 
              fontWeight: 500,
              display: "block", 
              marginBottom: "6px" 
            }}>
              รหัสผ่าน
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={14} style={{ position: "absolute", left: "4px", top: "50%", transform: "translateY(-50%)", color: "var(--txt3)", opacity: 0.7 }} />
              <input 
                type="password" 
                className="inp"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingLeft: "32px", paddingRight: "8px", width: "100%" }}
                disabled={loading}
              />
            </div>
          </div>

          {!isLogin && (
            <div className="fade">
              <label style={{ 
                fontSize: "11px", 
                color: "var(--txt3)", 
                textTransform: "uppercase", 
                letterSpacing: "0.08em", 
                fontWeight: 500,
                display: "block", 
                marginBottom: "6px" 
              }}>
                ยืนยันรหัสผ่าน
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={14} style={{ position: "absolute", left: "4px", top: "50%", transform: "translateY(-50%)", color: "var(--txt3)", opacity: 0.7 }} />
                <input 
                  type="password" 
                  className="inp"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{ paddingLeft: "32px", paddingRight: "8px", width: "100%" }}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-g btn-full"
            style={{
              marginTop: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="spin" />
                <span>กำลังดำเนินการ...</span>
              </>
            ) : (
              <>
                <span>{isLogin ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Admin Auto-fill Assistant */}
        <div 
          style={{
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "1px solid var(--bdr2)",
            textAlign: "center"
          }}
        >
          <button
            type="button"
            onClick={handleAutoFill}
            style={{
              background: "transparent",
              border: "1px solid var(--accent)",
              borderRadius: "var(--r-pill)",
              padding: "8px 16px",
              fontSize: "11px",
              color: "var(--accent)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontFamily: "'DM Sans', sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontWeight: 500,
              transition: "all 500ms cubic-bezier(0.19, 1, 0.22, 1)"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "var(--accent)";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--accent)";
            }}
          >
            <Sparkles size={12} />
            <span>กรอกบัญชีแอดมินทดสอบ (Admin Auto-Fill)</span>
          </button>
          <div style={{ fontSize: "10px", color: "var(--txt3)", marginTop: "8px", letterSpacing: "0.02em" }}>
            admin@lottolens.com / admin1234
          </div>
        </div>
      </div>
    </div>
  );
}
