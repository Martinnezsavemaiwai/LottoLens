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
    <div className="modal-backdrop" onClick={handleClose} style={{ zIndex: 1000 }}>
      <div 
        className="modal-content card" 
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "28px",
          background: "rgba(18, 18, 18, 0.75)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.05)",
          borderRadius: "20px",
          position: "relative"
        }}
      >
        {/* Glow Effects */}
        <div 
          style={{
            position: "absolute",
            top: "-10%",
            left: "-10%",
            width: "120px",
            height: "120px",
            background: "var(--accent)",
            filter: "blur(80px)",
            opacity: 0.15,
            pointerEvents: "none"
          }}
        />

        {/* Close Button */}
        <button 
          onClick={handleClose}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--txt2)",
            transition: "all 0.2s"
          }}
        >
          <X size={16} />
        </button>

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "24px", color: "var(--accent3)", margin: "0 0 6px 0" }}>
            LottoLens Portal
          </h2>
          <p style={{ fontSize: "11px", color: "var(--txt3)", margin: 0 }}>
            {isLogin ? "เข้าสู่ระบบเพื่อใช้งานฟีเจอร์ระดับแอดมิน" : "สมัครสมาชิกสำหรับเข้าใช้งานระบบ"}
          </p>
        </div>

        {/* Tab Selector */}
        <div 
          style={{
            display: "flex",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "10px",
            padding: "4px",
            marginBottom: "20px"
          }}
        >
          <button 
            onClick={() => { setIsLogin(true); setError(""); }}
            style={{
              flex: 1,
              padding: "8px",
              background: isLogin ? "rgba(255, 255, 255, 0.08)" : "transparent",
              border: "none",
              borderRadius: "8px",
              color: isLogin ? "var(--accent2)" : "var(--txt3)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            เข้าสู่ระบบ
          </button>
          <button 
            onClick={() => { setIsLogin(false); setError(""); }}
            style={{
              flex: 1,
              padding: "8px",
              background: !isLogin ? "rgba(255, 255, 255, 0.08)" : "transparent",
              border: "none",
              borderRadius: "8px",
              color: !isLogin ? "var(--accent2)" : "var(--txt3)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            สมัครสมาชิก
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div 
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid var(--red)",
              color: "var(--red)",
              borderRadius: "10px",
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
              background: "rgba(76, 175, 80, 0.1)",
              border: "1px solid rgba(76, 175, 80, 0.25)",
              color: "#4caf50",
              borderRadius: "10px",
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
            <label style={{ fontSize: "10px", color: "var(--txt3)", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "6px" }}>
              อีเมล
            </label>
            <div style={{ position: "relative" }}>
              <Mail size={14} style={{ position: "absolute", left: "12px", top: "12px", color: "var(--txt3)" }} />
              <input 
                type="email" 
                className="inp"
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ paddingLeft: "36px", width: "100%", height: "38px" }}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "10px", color: "var(--txt3)", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "6px" }}>
              รหัสผ่าน
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={14} style={{ position: "absolute", left: "12px", top: "12px", color: "var(--txt3)" }} />
              <input 
                type="password" 
                className="inp"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingLeft: "36px", width: "100%", height: "38px" }}
                disabled={loading}
              />
            </div>
          </div>

          {!isLogin && (
            <div className="fade">
              <label style={{ fontSize: "10px", color: "var(--txt3)", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "6px" }}>
                ยืนยันรหัสผ่าน
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={14} style={{ position: "absolute", left: "12px", top: "12px", color: "var(--txt3)" }} />
                <input 
                  type="password" 
                  className="inp"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{ paddingLeft: "36px", width: "100%", height: "38px" }}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-g"
            style={{
              height: "40px",
              marginTop: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontSize: "13px"
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
            marginTop: "20px",
            paddingTop: "14px",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            textAlign: "center"
          }}
        >
          <button
            onClick={handleAutoFill}
            style={{
              background: "rgba(201, 149, 42, 0.08)",
              border: "1px solid rgba(201, 149, 42, 0.2)",
              borderRadius: "8px",
              padding: "6px 14px",
              fontSize: "11px",
              color: "var(--gold2)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s"
            }}
          >
            <Sparkles size={12} />
            <span>กรอกบัญชีแอดมินทดสอบ (Admin Auto-Fill)</span>
          </button>
          <div style={{ fontSize: "9px", color: "var(--txt3)", marginTop: "6px" }}>
            admin@lottolens.com / admin1234
          </div>
        </div>
      </div>
    </div>
  );
}
