package com.cyepro.hyundai.chat;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class VehicleQueryPlannerTest {

    private final VehicleQueryPlanner planner = new VehicleQueryPlanner();

    @Test
    void comparisonSelectsEachNamedVehicle() {
        VehicleQueryPlanner.RetrievalPlan plan = planner.plan("Compare Alcazar vs Creta on safety");
        assertThat(plan.comparison()).isTrue();
        assertThat(plan.vehicles()).containsExactly("ALCAZAR", "CRETA");
        assertThat(plan.aspect()).contains("safety");
    }

    @Test
    void recommendationDoesNotInventAVehicle() {
        VehicleQueryPlanner.RetrievalPlan plan = planner.plan("Which car is best for my family, i20 or Aura?");
        assertThat(plan.recommendation()).isTrue();
        assertThat(plan.vehicles()).containsExactly("I20", "AURA");
    }

    @Test
    void questionWithoutAModelSearchesEveryBrochure() {
        VehicleQueryPlanner.RetrievalPlan plan = planner.plan("What sunroofs are offered?");
        assertThat(plan.vehicles()).isEmpty();
    }
}
