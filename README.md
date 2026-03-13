# Operational Process Modeler

Operational Process Modeler is a SaaS tool for visually modeling operational processes and analyzing capacity constraints. Instead of maintaining complex Excel spreadsheets, users draw a process flow on a canvas where each step represents a process with configurable capacity and efficiency. The system calculates throughput, utilization, and bottlenecks based on demand and process constraints.

The goal is to provide a lightweight alternative to complex ERP planning tools for capacity planning and operational analysis.

## Problem

Many organizations model operational capacity in Excel.

These models become difficult to maintain when:

- multiple process steps exist
- capacities differ per step
- materials change form throughout the process
- scenarios need to be tested

Small changes, such as adding a machine, changing efficiency, or updating demand, often require large manual updates.

ERP systems address some of these problems, but they are often:

- expensive
- complex
- slow to implement
- too heavy for capacity modeling use cases

## Solution

This product provides a visual alternative to Excel-based capacity models.

Users model a process by drawing a flow of process steps. Each step contains capacity parameters such as processing rate, efficiency, number of machines, and operating hours.

Based on demand and process configuration, the system calculates:

- required throughput
- utilization per process step
- the process bottleneck

Canvas status thresholds use utilization bands to surface risk quickly:

- green below 85%
- orange from 85% through 95%
- red above 95%, with a warning triangle on the node

Numerical values on the canvas are shortened for readability (e.g., 150k instead of 150,000) to ensure the UI remains clean even with large production volumes.

In production systems, the bottleneck determines the maximum throughput of the entire system because the slowest step limits total capacity.

The tool is designed for fast scenario analysis: users can quickly modify process parameters and immediately see the impact on the system.

## Target Users

The product is designed for people responsible for operational performance and process improvement, such as:

- operations managers
- process engineers
- planners
- production managers
- operations teams in small and medium organizations

## Core Concept

Users model a process as a flow network.

The process consists of:

- nodes representing process steps
- edges representing flow between process steps
- linear topology only in V1 (no branching)

Node ports are type-specific in V1:

- Source: 0 input / 1 output
- Process: 1 input / 1 output
- Sink: 1 input / 0 output

Demand is entered one time globally and tied to the sink output material (final output product). The system then propagates required throughput through the process and calculates the capacity utilization of each step.

Throughput is calculated by first normalizing each node capacity to sink-output units, then taking the minimum normalized capacity. That minimum is the bottleneck-limited system throughput.

## V1 Scope

Version 1 focuses on deterministic capacity modeling for a single process flow.

V1 includes:

- visual process flow builder
- nodes representing process steps
- connections between process steps
- configurable process parameters
- processing rate
- efficiency
- number of machines
- operating hours
- material conversion between process steps
- one global demand input tied to sink output material
- deterministic capacity calculation
- utilization calculation
- bottleneck detection
- simple scenario testing

## Out of Scope for V1

The first version intentionally excludes advanced simulation and planning features.

Not included in V1:

- stochastic simulation
- queues
- random failures
- discrete-event simulation
- production scheduling
- planning optimization
- multi-product mix optimization

These may be added in later versions, but they are not part of the initial product.

## Tech Stack

Frontend:

- Next.js
- React
- React Flow

Backend:

- Supabase
- PostgreSQL

Infrastructure:

- Vercel

## Guidance for Developers and Coding Agents

This project is a deterministic capacity modeling tool, not a general simulation platform.

When working on the product, preserve these core assumptions:

- the primary workflow is drawing a process flow on a canvas
- demand is entered for the final output
- the system derives required throughput across upstream steps
- utilization and bottlenecks are core outputs
- V1 should remain lightweight and easy to understand

Avoid adding features that imply simulation or optimization unless they are explicitly planned for a later version.

## Development Goal

The goal of this project is to create a simple and fast capacity modeling tool that helps organizations understand process constraints and bottlenecks without the complexity of Excel models or ERP systems.

The product prioritizes:

- visual modeling
- fast scenario testing
- clear operational insight
