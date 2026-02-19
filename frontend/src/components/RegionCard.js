import React from "react";
import { Card, CardContent, Typography, Alert } from "@mui/material";

const RegionCard = ({ region }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">{region.name}</Typography>
        <Typography>Usage: {region.usage} kWh</Typography>
        {region.anomaly && (
          <Alert severity="error">
            ⚠ Overuse Detected – Circuit Trip Triggered
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default RegionCard;
