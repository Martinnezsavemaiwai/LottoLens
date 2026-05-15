backend/
├── go.mod
├── go.sum                    # สร้างโดย go mod tidy
├── Makefile
├── .env.example
├── .env                      # สร้างเองจาก .env.example (ไม่ commit)
├── prisma/
│   └── schema.prisma
└── db/
    └── prisma/               # สร้างโดย prisma generate (ไม่แก้ไขมือ)
