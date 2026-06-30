/**
 * Loading component aligning with the Mocha Mousse design system.
 */
export default function Loading({ message = "กำลังโหลดข้อมูล..." }) {
  return (
    <div 
      className="card" 
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px",
        minHeight: "200px",
        margin: "20px 0"
      }}
    >
      <div 
        className="spin"
        style={{
          width: "40px",
          height: "40px",
          border: "2.5px solid var(--bdr2)",
          borderRadius: "50%",
          borderTopColor: "var(--accent)",
          marginBottom: "16px"
        }}
      />
      <p 
        style={{
          color: "var(--txt2)",
          fontSize: "12px",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontFamily: "'DM Sans', sans-serif"
        }}
      >
        {message}
      </p>
    </div>
  );
}
