import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"

export type UserRole = 'ADMIN' | 'PLANNER' | 'CONSULTANT'

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      role: UserRole
      employeeId?: string | null
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    role: UserRole
    employeeId?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: UserRole
    employeeId?: string | null
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as UserRole,
          employeeId: user.employeeId
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.employeeId = user.employeeId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.employeeId = token.employeeId
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}

// Permission helpers
export function canManageEmployees(role: UserRole): boolean {
  return role === 'ADMIN'
}

export function canEditForecast(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'PLANNER'
}

export function canManageClients(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'PLANNER'
}

export function canManageSalesTargets(role: UserRole): boolean {
  return role === 'ADMIN'
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'ADMIN'
}

export function canViewFullDashboard(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'PLANNER'
}
